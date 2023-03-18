const { validationResult } = require("express-validator");

// Esta es una función middleware que se encarga de validar los campos de una petición HTTP
// utilizando el middleware de validación de express-validator.
// Si se detectan errores de validación, la función responde con un status 400 (Bad Request)
// y envía los errores en formato JSON.
// Si no hay errores, la función llama a la siguiente función middleware.
const validarCampos = (req, res, next) => {
	const errors = validationResult(req); // Validar los campos de la petición
	if (!errors.isEmpty()) {
		// Si hay errores
		return res.status(400).json(errors); // Responder con status 400 y los errores en formato JSON
	}

	next(); // Si no hay errores, llamar a la siguiente función middleware
};

module.exports = {
	validarCampos,
};
