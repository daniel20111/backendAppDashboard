const express = require("express");
const {
	obtenerTodasLasFacturas,
	crearFactura,
	obtenerFacturaPorId,
} = require("../controllers/facturas"); // Asegúrate de que la ruta sea la correcta

const router = express.Router();

// Obtener todas las facturas - público
router.get("/", obtenerTodasLasFacturas);

// Obtener factura por id - público
router.get("/:id", obtenerFacturaPorId);

// Crear factura - publico
router.post("/", crearFactura);

module.exports = router;
