const Role = require("../models/role");
const {
	Usuario,
	Categoria,
	Producto,
	Stock,
	Movimiento,
} = require("../models");
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

const existeStockPorId = async (id) => {
	// Verificar si el correo existe
	const existeMovimiento = await Movimiento.findById(id);

	const request = {
		sucursal: existeMovimiento.sucursal,
		producto: existeMovimiento.producto,
	};

	const existeStock = await Stock.findOne(request);

	if (existeStock.cantidad < existeMovimiento.cantidad) {
		throw new Error(`El stock no tiene suficiente cantidad`);
	}
};

const existeCantidadTraspaso = async (body) => {
	const { productos } = body;
	console.log("Dentro de existeCantidadTraspaso");
	console.log(body);

	console.log("Iniciando la verificación de existencias de productos...");
	let contador = 0; // Iniciamos contador en 0

	for (let i = 0; i < productos.length; i++) {
		const productoObj = productos[i];

		const { producto, cantidad, origen } = productoObj;

		const query = {
			sucursal: origen,
			producto,
		};

		const stock = await Stock.findOne(query);

		console.log(
			`Verificando stock para el producto ${producto} en la sucursal ${origen}`
		);

		if (!stock || stock.cantidad < cantidad) {
			console.log(
				`Producto: ${producto}, Origen: ${origen}, Stock actual: ${
					stock ? stock.cantidad : "No encontrado"
				}, Cantidad solicitada: ${cantidad}`
			);
		} else {
			contador++; // Aumentamos el contador en 1 si el stock puede satisfacer la cantidad solicitada
		}
	}

	console.log(contador);
	console.log(productos.length);

	if (contador !== productos.length){
		throw new Error("No hay suficientes productos en el stock");
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
	existeCantidadTraspaso,
	coleccionesPermitidas,
	existeStockPorId,
};
