const { Router } = require("express");
const { check } = require("express-validator");

const { validarCampos, validarJWT } = require("../middlewares");

const {
	login,
	googleSignin,
	validarTokenUsuario,
} = require("../controllers/auth");

const router = Router();

// Ruta para iniciar sesión
router.post(
	"/login",
	[
		check("correo", "El correo es obligatorio").isEmail(),
		check("password", "La contraseña es obligatoria").not().isEmpty(),
		validarCampos, // Validamos los campos antes de ejecutar la función de login
	],
	login
);

// Ruta para iniciar sesión con Google
router.post(
	"/google",
	[
		check("id_token", "El id_token es necesario").not().isEmpty(),
		validarCampos, // Validamos los campos antes de ejecutar la función de googleSignin
	],
	googleSignin
);

// Ruta para validar el token de un usuario
router.get("/", [validarJWT], validarTokenUsuario);

module.exports = router;
