const { Router } = require("express");
const { check } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
  existeCategoriaPorId,
  existeProductoPorId,
} = require("../helpers/db-validators");
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
    //check("producto", "No es un id de Mongo").isMongoId(),
    //check("producto").custom(existeProductoPorId),
    //validarCampos,
  ],
  crearTraspaso
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
