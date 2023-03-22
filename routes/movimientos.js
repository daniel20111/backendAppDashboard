const { Router } = require("express");
const { check } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
  existeCategoriaPorId,
  existeProductoPorId,
} = require("../helpers/db-validators");
const { obtenerMovimientos } = require("../controllers/movimientos");

const router = Router();

router.get("/", obtenerMovimientos);


module.exports = router;
