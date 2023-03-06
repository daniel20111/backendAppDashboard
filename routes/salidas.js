const { Router } = require("express");
const { check, body } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
	existeCategoriaPorId,
	existeProductoPorId,
	existeStock,
} = require("../helpers/db-validators");
const { obtenerSalidas, crearSalida } = require("../controllers/salidas");

const router = Router();

/**
 * {{url}}/api/categorias
 */

//  Obtener todas las categorias - publico
router.get("/", obtenerSalidas);

// Crear categoria - privado - cualquier persona con un token válido
router.post(
	"/",
	[
		validarJWT,
		check("producto", "No es un id de Mongo").isMongoId(),
		check("producto").custom(existeProductoPorId),
		body().custom(existeStock),
		validarCampos,
	],
	crearSalida
);

// Actualizar - privado - cualquiera con token válido
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
