const { Router } = require("express");
const { check, body } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
	existeCategoriaPorId,
	existeProductoPorId,
	existeStock,
	existeStockPorId,
} = require("../helpers/db-validators");
const {
	obtenerSalidas,
	crearSalida,
	actualizarSalida,
} = require("../controllers/salidas");

const router = Router();

/**
 * Rutas de salidas de productos
 */

// Obtener todas las salidas de productos - público
router.get("/", obtenerSalidas);

// Crear una nueva salida de producto - privado - cualquier persona con un token válido
router.post(
	"/",
	[
		validarJWT,
		check("producto", "No es un id de Mongo válido").isMongoId(),
		check("producto").custom(existeProductoPorId),
		body().custom(existeStock), // Verificar si hay suficiente stock
		validarCampos,
	],
	crearSalida
);

// Actualizar una salida de producto - privado - cualquier persona con un token válido
router.put(
	"/:id",
	[
		validarJWT,
		check("id").custom(existeStockPorId), // Verificar si la salida de producto existe
		validarCampos,
	],
	actualizarSalida
);

// Borrar una salida de producto - Admin
/*router.delete(
	"/:id",
	[
		validarJWT,
		esAdminRole,
		check("id", "No es un id de Mongo válido").isMongoId(),
		check("id").custom(existeProductoPorId),
		validarCampos,
	],
	borrarProducto
);*/

module.exports = router;
