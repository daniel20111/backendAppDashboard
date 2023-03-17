const { Router } = require("express");
const { check, body } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
	crearCotizacion,
	obtenerCotizaciones,
	obtenerCotizacionPorId,
} = require("../controllers/cotizaciones");

const router = Router();

/**
 * {{url}}/api/categorias
 */

//  Obtener todas las categorias - publico
router.get("/", obtenerCotizaciones);

// Obtener cotizacion por ID
router.get("/:id", obtenerCotizacionPorId);

// Crear categoria - privado - cualquier persona con un token válido
router.post("/", validarJWT, crearCotizacion);

// Actualizar - privado - cualquiera con token válidoa
/*router.put('/:id',[
    validarJWT,
    // check('categoria','No es un id de Mongo').isMongoId(),
    check('id').custom( existeProductoPorId ),
    validarCampos
], actualizarProducto );

// Borrar una categoria - Admin
router.delete('/:id',[
    validarJWT,
    esAdminRole,
    check('id', 'No es un id de Mongo válido').isMongoId(),
    check('id').custom( existeProductoPorId ),
    validarCampos,
], borrarProducto);*/

module.exports = router;
