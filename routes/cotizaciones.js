const { Router } = require("express");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
	crearCotizacion,
	obtenerCotizaciones,
	obtenerCotizacionPorId,
	actualizarCotizacion,
	simularCotizacionesMasivas,
} = require("../controllers/cotizaciones");

const router = Router();

/**
 * Rutas para obtener y crear cotizaciones
 */

//  Obtener todas las cotizaciones - público
router.get("/", obtenerCotizaciones);

// Obtener cotización por ID - público
router.get("/:id", obtenerCotizacionPorId);

// Crear cotización - privado - cualquier persona con un token válido
router.post("/", [validarJWT, validarCampos], crearCotizacion);

// Simular cotizaciones masivas - privado - solo admin
router.post("/simular", [validarJWT, esAdminRole], simularCotizacionesMasivas);

router.put("/:id", [validarJWT, validarCampos], actualizarCotizacion);

// Borrar una cotización - privado - solo admin
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
