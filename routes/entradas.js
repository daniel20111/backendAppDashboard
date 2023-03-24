const { Router } = require("express");
const { check } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");
const { existeProductoPorId } = require("../helpers/db-validators");
const {
	obtenerEntradas,
	crearEntrada,
	actualizarEntrada,
	obtenerEntrada,
} = require("../controllers/entradas");

const router = Router();

/**
 * {{url}}/api/entradas
 */

// Obtener todas las entradas - público
router.get("/", obtenerEntradas);

// Obtener entrada por id - público
router.get("/:id", obtenerEntrada);

// Crear entrada - privado - cualquier persona con un token válido
router.post(
	"/",
	[
		validarJWT,
		validarCampos,
	],
	crearEntrada
);

// Actualizar entrada - privado - cualquiera con token válido
router.put(
	"/:id",
	[
		validarJWT,
		// check('categoria','No es un id de Mongo').isMongoId(), <- Esta línea parece estar en desuso y se puede eliminar
	],
	actualizarEntrada
);

// Borrar una entrada - Admin
// router.delete('/:id',[
//     validarJWT,
//     esAdminRole,
//     check('id', 'No es un id de Mongo válido').isMongoId(),
//     check('id').custom( existeProductoPorId ),
//     validarCampos,
// ], borrarProducto); <- Esta ruta no está en uso y se puede eliminar

module.exports = router;
