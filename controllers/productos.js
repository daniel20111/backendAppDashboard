const { response } = require("express");
const {
	Producto,
	Categoria,
	Sucursal,
	Stock,
	Proveedor,
} = require("../models");
const mongoose = require("mongoose");

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
			.populate("categoria", "nombre")
			.populate("proveedor"),
		// Obtener información de la categoría relacionada
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
		.populate("categoria", "nombre")
		.populate("proveedor"); // Obtener información de la categoría relacionada

	// Devolver el producto
	res.json(producto);
};

const crearProducto = async (req, res = response) => {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const { estado, usuario, categoria, proveedor, ...body } = req.body;

		// Verificar si el producto ya existe
		const productoDB = await Producto.findOne({ nombre: body.nombre }).session(
			session
		);

		if (productoDB) {
			await session.abortTransaction();
			session.endSession();
			return res.status(400).json({
				msg: `El producto ${productoDB.nombre}, ya existe`,
			});
		}

		// Obtener la información de la categoría seleccionada
		const categoriaDB = await Categoria.findById(categoria).session(session);

		if (!categoriaDB) {
			await session.abortTransaction();
			session.endSession();
			return res.status(400).json({
				msg: `La categoría seleccionada no existe`,
			});
		}

		//Obtener la información del proveedor seleccionado
		const proveedorDB = await Proveedor.findById(proveedor).session(session);

		if (!proveedorDB) {
			await session.abortTransaction();
			session.endSession();
			return res.status(400).json({
				msg: `El proveedor seleccionado no existe`,
			});
		}

		// Generar el código del producto
		const contadorProductos = await Producto.countDocuments({}).session(
			session
		);
		const contadorFormateado = String(contadorProductos + 1).padStart(3, "0");
		const dimensionesFormateadas = categoriaDB.dimensiones
			.replace("x", "")
			.replace("cm", "");
		const unidadesPorCaja = String(categoriaDB.unidadesPorCaja).padStart(
			2,
			"0"
		);
		const codigoCategoria = `${categoriaDB.material.charAt(
			0
		)}${dimensionesFormateadas}${categoriaDB.acabado.charAt(
			0
		)}${unidadesPorCaja}`.toUpperCase();
		const codigoProducto = `${codigoCategoria}${contadorFormateado}`;

		// Generar la data a guardar
		const data = {
			...body,
			nombre: body.nombre,
			usuario: req.usuario._id,
			categoria: categoria,
			proveedor: proveedor,
			precioCaja: body.precioCaja || categoriaDB.precioCaja,
			precioPorUnidad: body.precioPorUnidad || categoriaDB.precioPorUnidad,
			codigoProducto, // Añadir el código del producto
		};

		// Crear una nueva instancia de Producto
		const producto = new Producto(data);

		// Guardar el producto en la base de datos
		await producto.save({ session });

		// Obtener todas las sucursales
		const sucursales = await Sucursal.find({}).session(session);

		// Crear un stock con el nuevo producto para cada sucursal existente
		for (const sucursal of sucursales) {
			const stockData = {
				cantidadCajas: 0,
				cantidadPiezas: 0,
				producto: producto._id,
				sucursal: sucursal._id,
			};

			const stock = new Stock(stockData);
			await stock.save({ session });
		}

		// Commit the transaction
		await session.commitTransaction();
		session.endSession();

		await producto
			.populate("usuario", "nombre") // Obtener información del usuario relacionado
			.populate("categoria", "nombre")
			.populate("proveedor") // Obtener información de la categoría relacionada
			.execPopulate();

		res.status(201).json(producto);
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error al crear el producto",
		});
	}
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
		.populate("categoria", "nombre")
		.populate("proveedor") // Obtener información de la categoría relacionada
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
