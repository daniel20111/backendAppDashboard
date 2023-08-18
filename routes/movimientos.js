const { Router } = require("express");
const { check } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
	existeCategoriaPorId,
	existeProductoPorId,
} = require("../helpers/db-validators");
const {
	obtenerMovimientos,
	buscarMovimientos,
	obtenerMovimientosPorVenta,
} = require("../controllers/movimientos");

const router = Router();

router.get("/", obtenerMovimientos);
router.get("/buscar", buscarMovimientos);
router.get("/venta/:ventaId", obtenerMovimientosPorVenta);

module.exports = router;
