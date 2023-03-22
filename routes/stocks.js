const { Router } = require("express");
const { check } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
	obtenerTodosLosStocks,
	obtenerStocksPorId,
	obtenerStockPorId,
} = require("../controllers/stocks");

const {
	validarIdProductoSucursal,
	existeStockPorId,
} = require("../helpers/db-validators");

const router = Router();

/**
 * {{url}}/api/stocks
 */

// Obtener todos los stocks - publico
router.get("/", obtenerTodosLosStocks);

// Obtener stocks por id - publico
router.get(
	"/buscar/:id",
	[
		check("id")
			.custom(validarIdProductoSucursal)
			.withMessage("El id no existe en la base de datos"),
		validarCampos,
	],
	obtenerStocksPorId
);
router.get(
	"/:id",
	[
		check("id")
			.custom(existeStockPorId)
			.withMessage("El id no existe en la base de datos"),
		validarCampos,
	],
	obtenerStockPorId
);

module.exports = router;
