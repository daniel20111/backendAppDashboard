const { Router } = require("express");
const { check } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
	crearPedido,
	obtenerPedidos,
	obtenerPedido,
	actualizarPedido,
	eliminarPedido,
	obtenerProductosReservados,
	crearMovimientos,
} = require("../controllers/pedidos");

const {
	existePedidoPorId,
	existeClientePorId,
} = require("../helpers/db-validators");

const router = Router();

/**
 * {{url}}/api/pedidos
 */

//  Obtener todos los pedidos - publico
router.get("/", obtenerPedidos);

// Obtener un pedido por id - publico
router.get(
	"/pedido/:id",
	[check("id", "No es un id de Mongo válido").isMongoId(), validarCampos],
	obtenerPedido
);

// Obtener productos reservados - publico
router.get("/reservados", obtenerProductosReservados);

// Crear pedido - privado - cualquier persona con un token válido
router.post("/", [validarJWT, validarCampos], crearPedido);

//crear movimientos - privado - cualquier persona con un token válido
router.put(
	"/crear-movimientos/:id",
	[validarJWT, validarCampos],
	crearMovimientos
);

// Actualizar pedido - privado - cualquier persona con un token válido
router.put(
	"/:id",
	[
		validarJWT,
		check("id", "No es un id de Mongo válido").isMongoId(),
		validarCampos,
	],
	actualizarPedido
);

// Borrar un pedido - privado - solo admin
router.delete(
	"/:id",
	[
		validarJWT,
		esAdminRole,
		check("id", "No es un id de Mongo válido").isMongoId(),
		validarCampos,
	],
	eliminarPedido
);

module.exports = router;
