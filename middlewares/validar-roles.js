const { response } = require("express");

// Verifica si el usuario es administrador
const esAdminRole = (req, res = response, next) => {
	validarRol(req, res, next, "Administrador");
};

// Verifica si el usuario es vendedor
const esVendedorRole = (req, res = response, next) => {
	validarRol(req, res, next, "Vendedor");
};

// Verifica si el usuario es supervisor
const esSupervisorRole = (req, res = response, next) => {
	validarRol(req, res, next, "Supervisor");
};

// Verifica si el usuario es responsable de inventarios
const esInventariosRole = (req, res = response, next) => {
	validarRol(req, res, next, "Inventarios");
};

// Función genérica para validar un rol específico
const validarRol = (req, res, rol) => {
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
};

module.exports = {
	esAdminRole,
	esVendedorRole,
	esSupervisorRole,
	esInventariosRole,
};
