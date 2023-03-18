const { Router } = require("express");
const { check } = require("express-validator");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
	crearCategoria,
	obtenerCategorias,
	obtenerCategoria,
	actualizarCategoria,
	borrarCategoria,
} = require("../controllers/categorias");
const { existeCategoriaPorId } = require("../helpers/db-validators");

const router = Router();

/**
 * {{url}}/api/categorias
 */

//  Obtener todas las categorias - publico
router.get("/", obtenerCategorias);

// Obtener una categoria por id - publico
router.get(
	"/:id",
	[
		check("id", "No es un id de Mongo válido").isMongoId(),
		check("id").custom(existeCategoriaPorId),
		validarCampos,
	],
	obtenerCategoria
);

// Crear categoria - privado - cualquier persona con un token válido
router.post(
	"/",
	[
		validarJWT,
		check("dimensiones", "Las dimensiones son obligatorias").notEmpty(),
		check("dimensiones", "Las dimensiones no son válidas").isIn([
			"60x60cm",
			"30x30cm",
			"45x45cm",
			"30x60cm",
			"60x120cm",
		]),
		check("acabado", "El acabado es obligatorio").notEmpty(),
		check("acabado", "El acabado no es válido").isIn([
			"brillante",
			"mate",
			"texturizado",
		]),
		check("material", "El material es obligatorio").notEmpty(),
		check("material", "El material no es válido").isIn([
			"ceramica",
			"porcelanato",
			"gres",
		]),
		check("precioCaja", "El precio de la caja es obligatorio").notEmpty(),
		check("precioCaja", "El precio de la caja debe ser un número").isNumeric(),
		check(
			"unidadesPorCaja",
			"El número de unidades por caja es obligatorio"
		).notEmpty(),
		check(
			"unidadesPorCaja",
			"El número de unidades por caja debe ser un número entero"
		).isInt(),
		validarCampos,
	],
	crearCategoria
);

// Actualizar - privado - cualquiera con token válido
router.put(
	"/:id",
	[
		validarJWT,
		check("nombre", "El nombre es obligatorio").not().isEmpty(),
		check("id").custom(existeCategoriaPorId),
		validarCampos,
	],
	actualizarCategoria
);

// Borrar una categoria - Admin
router.delete(
	"/:id",
	[
		validarJWT,
		check("id", "No es un id de Mongo válido").isMongoId(),
		check("id").custom(existeCategoriaPorId),
		validarCampos,
	],
	borrarCategoria
);

module.exports = router;
