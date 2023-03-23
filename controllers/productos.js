const { response } = require("express");
const { Producto } = require("../models");

// Función para obtener todos los productos
const obtenerProductos = async (req, res = response) => {
	//const { limite = 10, desde = 0 } = req.query;
	const query = { estado: true };

	// Obtener el total de productos y la lista de productos
	const [total, productos] = await Promise.all([
		Producto.countDocuments(query),
		Producto.find(query)
			.sort("-fecha") // Ordenar por fecha descendente
			.populate("usuario", "nombre") // Obtener información del usuario relacionado
			.populate("categoria", "nombre"), // Obtener información de la categoría relacionada
		//.skip(Number(desde))
		//.limit(Number(limite)),
	]);

	// Devolver el total de productos y la lista de productos
	res.json({
		total,
		productos,
	});
};

// Función para obtener un producto por su ID
const obtenerProducto = async (req, res = response) => {
	const { id } = req.params;
	const producto = await Producto.findById(id)
		.populate("usuario", "nombre") // Obtener información del usuario relacionado
		.populate("categoria", "nombre"); // Obtener información de la categoría relacionada

	// Devolver el producto
	res.json(producto);
};

const crearProducto = async (req, res = response) => {
	const { estado, usuario, categoria, ...body } = req.body;

	// Verificar si el producto ya existe
	const productoDB = await Producto.findOne({ nombre: body.nombre });

	if (productoDB) {
		return res.status(400).json({
			msg: `El producto ${productoDB.nombre}, ya existe`,
		});
	}

	// Obtener la información de la categoría seleccionada
	const categoriaDB = await Categoria.findById(categoria);

	if (!categoriaDB) {
		return res.status(400).json({
			msg: `La categoría seleccionada no existe`,
		});
	}

	// Generar la data a guardar
	const data = {
		...body,
		nombre: body.nombre,
		usuario: req.usuario._id,
		categoria: categoria,
		precioCaja: body.precioCaja || categoriaDB.precioCaja,
		unidadesPorCaja: body.unidadesPorCaja || categoriaDB.unidadesPorCaja,
		precioPorUnidad: body.precioPorUnidad || categoriaDB.precioPorUnidad,
	};

	// Crear una nueva instancia de Producto
	const producto = new Producto(data);

	// Guardar el producto en la base de datos
	const nuevoProducto = await producto.save();
	await nuevoProducto
		.populate("usuario", "nombre") // Obtener información del usuario relacionado
		.populate("categoria", "nombre") // Obtener información de la categoría relacionada
		.execPopulate();

	// Devolver el producto creado
	res.status(201).json(nuevoProducto);
};

// Función para actualizar un producto
const actualizarProducto = async (req, res = response) => {
	const { id } = req.params;
	const { estado, usuario, ...data } = req.body;

	data.usuario = req.usuario._id;

	// Actualizar el producto en la base de datos
	const producto = await Producto.findByIdAndUpdate(id, data, { new: true });

	// Obtener la información actualizada del producto
	await producto
		.populate("usuario", "nombre") // Obtener información del usuario relacionado
		.populate("categoria", "nombre") // Obtener información de la categoría relacionada
		.execPopulate();

	// Devolver el producto actualizado
	res.json(producto);
};

// Función para borrar un producto (cambiar su estado a false)
const borrarProducto = async (req, res = response) => {
	const { id } = req.params;
	const productoBorrado = await Producto.findByIdAndUpdate(
		id,
		{ estado: false },
		{ new: true }
	);

	// Devolver el producto borrado (con estado cambiado a false)
	res.json(productoBorrado);
};

// Exportar las funciones para usarlas en otros módulos
module.exports = {
	crearProducto,
	obtenerProductos,
	obtenerProducto,
	actualizarProducto,
	borrarProducto,
};
