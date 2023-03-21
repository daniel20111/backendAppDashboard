const { Router } = require("express");
const { check } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
	obtenerTodosLosStocks,
	obtenerStocksPorId,
} = require("../controllers/stocks");

const { existeProductoPorId } = require("../helpers/db-validators");

const router = Router();

/**
 * {{url}}/api/stocks
 */

// Obtener todos los stocks - publico
router.get("/", obtenerTodosLosStocks);

// Obtener stocks por id - publico
router.get(
	"/:id",
	[
		check("id")
			.custom(
				(value) => existeProductoPorId(value) || existeSucursalPorId(value)
			)
			.withMessage("El id no existe en la base de datos"),
		validarCampos,
	],
	obtenerStocksPorId
);

module.exports = router;
