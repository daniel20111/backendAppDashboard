const { Router } = require("express");

const { validarJWT } = require("../middlewares");

const {
	crearCotizacion,
	obtenerCotizaciones,
	obtenerCotizacionPorId,
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
router.post("/", validarJWT, crearCotizacion);

// Actualizar cotización - privado - solo admin
/*router.put('/:id',[
    validarJWT,
    // check('categoria','No es un id de Mongo').isMongoId(),
    check('id').custom( existeProductoPorId ),
    validarCampos
], actualizarProducto );

// Borrar una cotización - privado - solo admin
router.delete('/:id',[
    validarJWT,
    esAdminRole,
    check('id', 'No es un id de Mongo válido').isMongoId(),
    check('id').custom( existeProductoPorId ),
    validarCampos,
], borrarProducto);*/

module.exports = router;
