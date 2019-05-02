const Sequelize = require("sequelize");
const {models} = require("../models");

// Autoload el quiz asociado a :quizId
exports.load = (req, res, next, quizId) => {

    models.quiz.findByPk(quizId)
    .then(quiz => {
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    })
    .catch(error => next(error));
};


// GET /quizzes
exports.index = (req, res, next) => {

    models.quiz.findAll()
    .then(quizzes => {
        res.render('quizzes/index.ejs', {quizzes});
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/show', {quiz});
};


// GET /quizzes/new
exports.new = (req, res, next) => {

    const quiz = {
        question: "",
        answer: ""
    };

    res.render('quizzes/new', {quiz});
};

// POST /quizzes/create
exports.create = (req, res, next) => {

    const {question, answer} = req.body;

    const quiz = models.quiz.build({
        question,
        answer
    });

    // Saves only the fields question and answer into the DDBB
    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz created successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/new', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error creating a new Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = (req, res, next) => {

    const {quiz, body} = req;

    quiz.question = body.question;
    quiz.answer = body.answer;

    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz edited successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/edit', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error editing the Quiz: ' + error.message);
        next(error);
    });
};


// DELETE /quizzes/:quizId
exports.destroy = (req, res, next) => {

    req.quiz.destroy()
    .then(() => {
        req.flash('success', 'Quiz deleted successfully.');
        res.redirect('/quizzes');
    })
    .catch(error => {
        req.flash('error', 'Error deleting the Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || '';

    res.render('quizzes/play', {
        quiz,
        answer
    });
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz,
        result,
        answer
    });
};


// GET /quizzes/randomplay
exports.randomPlay = (req, res, next) => {

	req.session.randomPlay = req.session.randomPlay || [];
    const op = Sequelize.Op;
    const whereOp = {id: {[op.notIn]: req.session.randomPlay}};


    models.quiz.count({where:whereOp})
    .then(count => {
        if(count===0){  
        	//Ya no queda ninguna pregunta por responder
            const puntos = req.session.randomPlay.length;
            // Vaciamos el array para la siguiente vez que se juegue
            req.session.randomPlay = [];
            res.render('quizzes/random_none',{puntos});
        }
        // Buscamos quiz aleatorio no jugado aun
        return models.quiz.findAll({
            where: whereOp,
            offset: Math.floor(count*Math.random()),
            limit: 1
        })
        .then(quizzes => {
            return quizzes[0];
        });
    })
    .then(quiz =>{
        const puntos = req.session.randomPlay.length;
        res.render('quizzes/random_play',{quiz, puntos});
    })
    .catch(error => {
        next(error);
    });
};


// GET /quizzes/randomcheck/:quizId?answer=<respuesta>
exports.randomCheck = (req, res, next) => {
	const {quiz, query} = req;
    const ans = query.answer || "";
    // Si la respuesta es correcta, result valdra 1 y si no, 0
    const result = ans.toLowerCase().trim() === quiz.answer.toLowerCase().trim();
    const puntos = req.session.randomPlay.length + result;
    // Añadimos el id de la pregunta bien contestada al array correspondiente
    req.session.randomPlay.push(quiz.id);
    if(!result){
    	// Respuesta erronea -> vaciamos array de las acertadas para la siguiente vez que se juegue
        req.session.randomPlay = [];
    }
    // Renderizamos la pagina de resultados
    res.render('quizzes/random_result', {ans, result, puntos});
};