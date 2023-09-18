const { Router } = require("express");
const { check } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");
const {
	obtenerClientes,
	crearCliente,
	buscarClientes,
} = require("../controllers/clientes");

const router = Router();

router.get("/", obtenerClientes);

router.get("/buscar", buscarClientes);

router.post(
	"/",
	[
		validarJWT,
		check("nombre", "El nombre es obligatorio").not().isEmpty(),
		validarCampos,
	],
	crearCliente
);

module.exports = router;
