const { Router } = require("express");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
	crearVenta,
	obtenerVentas,
	pagarVenta,
	obtenerVentaPorId,
} = require("../controllers/ventas");

const router = Router();

/**
 * Rutas para obtener y crear ventas
 */

//  Obtener todas las cotizaciones - público
router.get("/", obtenerVentas);

// Obtener una venta por id - público
router.get("/:id", obtenerVentaPorId);


// Crear venta - privado - cualquier persona con un token válido
router.post("/", [validarJWT, validarCampos], crearVenta);

// Pagar venta - privado - cualquier persona con un token válido
router.put("/pagar_venta/:id", [validarJWT, validarCampos], pagarVenta);

module.exports = router;
