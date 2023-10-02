const { Router } = require("express");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
	obtenerMovimientos,
	buscarMovimientos,
	obtenerMovimientosPorVenta,
	simularVentas,
	calculateEOQMetrics,
	simulateMovements,
} = require("../controllers/movimientos");

const router = Router();

router.get("/", obtenerMovimientos);
router.get("/buscar", buscarMovimientos);
router.get("/venta/:ventaId", obtenerMovimientosPorVenta);

router.post("/simular", [validarJWT, validarCampos], simularVentas);
router.post("/eoq", calculateEOQMetrics);

router.post("/simulate", simulateMovements);

module.exports = router;
