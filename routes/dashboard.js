//Rutas para Dashboard

const { Router } = require("express");
const { check } = require("express-validator");
const { validarCampos } = require("../middlewares/validar-campos");

const {
	obtenerDashboardPorId,
	obtenerTodosLosDashboards,
} = require("../controllers/dashboard");

const router = Router();

// Obtener todos los dashboards
router.get("/", obtenerTodosLosDashboards);


// Obtener Dashboard por id de sucursal

router.get("/:id", obtenerDashboardPorId);

module.exports = router;
