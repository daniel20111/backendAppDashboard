const Router    = require("express").Router();

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const { existeClientePorId } = require("../helpers/db-validators");


module.exports = Router;