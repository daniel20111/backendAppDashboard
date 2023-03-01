const { Router } = require("express");
const { check } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
	crearSucursal,
	obtenerSucursal,
	obtenerSucursales,
	actualizarSucursal,
	borrarSucursal,
} = require("../controllers/sucursales");

const router = Router();

/**
 * {{url}}/api/sucursales
 */

//  Obtener todas las sucursales - publico
router.get("/", obtenerSucursales);

// Obtener una sucursal por id - publico
router.get(
	"/:id",
	[check("id", "No es un id de Mongo válido").isMongoId(), validarCampos],
	obtenerSucursal
);

// Crear sucursal - privado - cualquier persona con un token válido
router.post("/", [validarJWT], crearSucursal);

// Actualizar - privado - cualquiera con token válido
router.put("/:id", [validarJWT], actualizarSucursal);

// Borrar una sucursal - Admin
router.delete("/:id", [validarJWT], borrarSucursal);

module.exports = router;
