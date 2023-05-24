const { Router } = require("express");
const { check, body } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const { existeCantidadTraspaso } = require("../helpers/db-validators");
const { obtenerTraspasos, crearTraspaso } = require("../controllers/traspasos");

const router = Router();

/**
 * {{url}}/api/categorias
 */

//  Obtener todas las categorias - publico
router.get("/", obtenerTraspasos);

// Crear categoria - privado - cualquier persona con un token válido
router.post(
	"/",
	[
		validarJWT,
		//check("productos").isArray(),
		//body().custom(existeCantidadTraspaso),
        validarCampos
	],
	crearTraspaso
);
module.exports = router;
