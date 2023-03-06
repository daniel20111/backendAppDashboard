const Role = require("../models/role");
const { Usuario, Categoria, Producto, Stock } = require("../models");
const { query } = require("express");

const esRoleValido = async (rol = "USER_ROLE") => {
	const existeRol = await Role.findOne({ rol });
	if (!existeRol) {
		throw new Error(`El rol ${rol} no está registrado en la BD`);
	}
};

const emailExiste = async (correo = "") => {
	// Verificar si el correo existe
	const existeEmail = await Usuario.findOne({ correo });
	if (existeEmail) {
		throw new Error(`El correo: ${correo}, ya está registrado`);
	}
};

const existeUsuarioPorId = async (id) => {
	// Verificar si el correo existe
	const existeUsuario = await Usuario.findById(id);
	if (!existeUsuario) {
		throw new Error(`El id no existe ${id}`);
	}
};

/**
 * Categorias
 */
const existeCategoriaPorId = async (id) => {
	// Verificar si el correo existe
	const existeCategoria = await Categoria.findById(id);
	if (!existeCategoria) {
		throw new Error(`El id no existe ${id}`);
	}
};

/**
 * Productos
 */
const existeProductoPorId = async (id) => {
	// Verificar si el correo existe
	const existeProducto = await Producto.findById(id);
	if (!existeProducto) {
		throw new Error(`El id no existe ${id}`);
	}
};

const existeStock = async (body, { req }) => {
	// Verificar si el correo existe

	const request = { sucursal: body.sucursal, producto: body.producto };
	
	const existeStock = await Stock.findOne(request);
	if (!existeStock) {
		throw new Error(`El stock no existe`);
	}
	if (existeStock.cantidad < body.cantidad) {
		throw new Error(`El stock no tiene suficiente cantidad`);
	}
};

/**
 * Validar colecciones permitidas
 */
const coleccionesPermitidas = (coleccion = "", colecciones = []) => {
	const incluida = colecciones.includes(coleccion);
	if (!incluida) {
		throw new Error(
			`La colección ${coleccion} no es permitida, ${colecciones}`
		);
	}
	return true;
};

module.exports = {
	esRoleValido,
	emailExiste,
	existeStock,
	existeUsuarioPorId,
	existeCategoriaPorId,
	existeProductoPorId,
	coleccionesPermitidas,
};
