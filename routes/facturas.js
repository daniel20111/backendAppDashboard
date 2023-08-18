const { Router } = require("express");

const router = Router();


const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

module.exports = router;