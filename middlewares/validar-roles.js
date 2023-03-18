const { response } = require("express");

const validarRol = (req, res, next, rol) => {
	if (!req.usuario) {
		return res.status(500).json({
			msg: "Se quiere verificar el rol sin validar el token primero",
		});
	}

	const { rol: rolUsuario, nombre } = req.usuario;

	if (rolUsuario !== rol) {
		return res.status(401).json({
			msg: `${nombre} no es ${rol} - No puede hacer esto`,
		});
	}

	// Si el usuario tiene el rol correcto, pasa al siguiente middleware
	next();
};

const esAdminRole = (req, res, next) => {
	validarRol(req, res, next, "Administrador");
};

const esVendedorRole = (req, res, next) => {
	validarRol(req, res, next, "Vendedor");
};

const esSupervisorRole = (req, res, next) => {
	validarRol(req, res, next, "Supervisor");
};

const esInventariosRole = (req, res, next) => {
	validarRol(req, res, next, "Inventarios");
};
module.exports = {
	esAdminRole,
	esVendedorRole,
	esSupervisorRole,
	esInventariosRole,
};
