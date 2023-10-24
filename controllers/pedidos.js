const Pedido = require("../models/pedido");
const mongoose = require("mongoose");
const Proveedor = require("../models/proveedor");
const Cotizacion = require("../models/cotizacion");
const Stock = require("../models/stock");
const Producto = require("../models/producto");
const Movimiento = require("../models/movimiento");
const Sucursal = require("../models/sucursal");

const { response } = require("express");

// CREATE - POST /pedidos
const crearPedido = async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();

	let transactionCommitted = false;

	try {
		const { productos } = req.body;
		const creado_por = req.usuario._id;

		const proveedores = {};

		for (const detalle of productos) {
			const productoDB = await Producto.findById(detalle.producto)
				.session(session)
				.populate("categoria")
				.populate("proveedor");

			if (!productoDB) {
				throw new Error(`El producto con id ${detalle.producto} no existe`);
			}

			const proveedorId = String(productoDB.proveedor._id);

			if (!proveedores[proveedorId]) {
				proveedores[proveedorId] = [];
			}

			proveedores[proveedorId].push({
				producto: detalle.producto,
				cantidadCajas: detalle.cantidadCajas,
			});
		}

		const pedidosCreados = [];

		for (const proveedorId in proveedores) {
			const pedidoData = {
				proveedor: proveedorId,
				creado_por,
				productoDetalles: proveedores[proveedorId],
			};

			const pedido = new Pedido(pedidoData);
			await pedido.save({ session });
			pedidosCreados.push(pedido);
		}

		await session.commitTransaction();
		transactionCommitted = true;
		session.endSession();

		for (const pedido of pedidosCreados) {
			await pedido
				.populate({
					path: "proveedor",
				})
				.populate({
					path: "creado_por",
					select: "nombre",
				})
				.populate({
					path: "productoDetalles.producto",
					populate: [
						{ path: "usuario", select: "nombre" },
						{ path: "categoria", select: "nombre" },
						{ path: "proveedor" },
					],
				})
				.populate({
					path: "movimientos",
					model: "Movimiento",
					populate: [
						{
							path: "usuario",
							model: "Usuario",
							select: "nombre",
						},
						{
							path: "verificado_por",
							model: "Usuario",
							select: "nombre",
						},
						{
							path: "stock",
							model: "Stock",
							populate: [
								{
									path: "producto",
									model: "Producto",
								},
								{
									path: "sucursal",
									model: "Sucursal",
									select: "municipio",
								},
							],
						},
					],
				})
				.execPopulate();
		}

		res.status(201).json(pedidosCreados);
	} catch (error) {
		if (!transactionCommitted) {
			await session.abortTransaction();
		}
		session.endSession();

		res.status(500).json({
			msg: "Error al crear los pedidos",
			error: error.message,
		});
	}
};

// READ - GET /pedidos/:id
const obtenerPedido = async (req, res = response) => {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const pedido = await Pedido.findById(req.params.id).session(session);

		if (!pedido) {
			await session.abortTransaction();
			session.endSession();
			throw new Error("Pedido no encontrado");
		}

		await session.commitTransaction();
		session.endSession();

		res.json(pedido);
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		res.status(404).json({ error: error.message });
	}
};

// READ - GET /pedidos/reservados
const obtenerProductosReservados = async (req, res) => {
	try {
		const productosReservados = await Cotizacion.aggregate([
			{ $unwind: "$productos" },
			{ $match: { "productos.reservado": true } },
			{
				$group: {
					_id: "$productos.producto",
					totalCajas: { $sum: "$productos.cantidadCajas" },
				},
			},
		]);

		// Contar cuántos productos diferentes hay en la lista
		const total = productosReservados.length;

		// Obtener los IDs de los productos para el posterior populate
		const productIds = productosReservados.map((prod) => prod._id);

		// Obtener los productos y realizar el populate
		const populatedProducts = await Producto.find({ _id: { $in: productIds } })
			.populate("usuario", "nombre")
			.populate("categoria", "nombre")
			.populate("proveedor");

		// Crear la lista final con los productos y su sumatoria respectiva
		const reservas = populatedProducts.map((product) => {
			const sumatoria = productosReservados.find(
				(prod) => String(prod._id) === String(product._id)
			);
			return {
				producto: product,
				sumatoria: {
					totalCajas: sumatoria ? sumatoria.totalCajas : 0,
				},
			};
		});

		res.json({ total, reservas });
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ error: "Error al obtener los productos reservados" });
	}
};

//POST /pedidos/crear-movimientos/:id

const crearMovimientos = async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const { id } = req.params;

		// Comprobar si el pedido existe
		const pedido = await Pedido.findById(id).session(session);
		if (!pedido) {
			throw new Error("Pedido no encontrado");
		}

		const { productoDetalles } = pedido;
		const movimientosCreados = [];

		for (const detalle of productoDetalles) {
			// Comprobar si el producto existe
			const productoDB = await Producto.findById(detalle.producto)
				.session(session)
				.populate("categoria")
				.populate("proveedor");

			if (!productoDB) {
				throw new Error(`El producto con id ${detalle.producto} no existe`);
			}

			// Buscar la sucursal con categoría 'CASA MATRIZ'
			const sucursalCasaMatriz = await Sucursal.findOne({
				categoria: "CASA MATRIZ",
			}).session(session);

			if (!sucursalCasaMatriz) {
				throw new Error(
					`No se encontró una sucursal con la categoría 'CASA MATRIZ'`
				);
			}

			// Buscar el stock que corresponda al producto y a la sucursal 'CASA MATRIZ'
			const stock = await Stock.findOne({
				producto: detalle.producto,
				sucursal: sucursalCasaMatriz._id,
			}).session(session);

			if (!stock) {
				throw new Error(
					`No se encontró el stock para el producto ${detalle.producto} en la sucursal 'CASA MATRIZ'`
				);
			}

			// Crear datos del movimiento
			const movimientoData = {
				usuario: req.usuario._id,
				cantidadCajas: detalle.cantidadCajas,
				cantidadPiezas: 0, // Debes reemplazar esto con el valor adecuado
				movimiento: "ENTRADA",
				verificado_por: null,
				fecha_verificacion: null,
				verificacion: "EN ESPERA",
				pedido: pedido._id,
				stock: stock._id,
				fecha: new Date(),
			};

			// Guardar el nuevo movimiento
			const movimiento = new Movimiento(movimientoData);
			await movimiento.save({ session });
			movimientosCreados.push(movimiento._id); // Guardamos solo el _id para añadir al pedido

			stock.entranteCajas += movimiento.cantidadCajas;

			await stock.save();
		}

		// Actualizar el pedido con los movimientos y cambiar el campo `pedido` a `true`
		await Pedido.findByIdAndUpdate(
			id,
			{
				$push: { movimientos: { $each: movimientosCreados } },
				pedido: true,
			},
			{ new: true, session }
		);

		// Si todo sale bien, commit la transacción
		await session.commitTransaction();

		// Finalizar la sesión
		session.endSession();

		// Popular el pedido con los detalles necesarios
		const pedidoCreado = await Pedido.findById(pedido._id)
			.populate({
				path: "proveedor",
			})
			.populate({
				path: "creado_por",
				select: "nombre",
			})
			.populate({
				path: "productoDetalles.producto",
				populate: [
					{ path: "usuario", select: "nombre" },
					{ path: "categoria", select: "nombre" },
					{ path: "proveedor" },
				],
			})
			.populate({
				path: "movimientos",
				model: "Movimiento",
				populate: [
					{
						path: "usuario",
						model: "Usuario",
						select: "nombre",
					},
					{
						path: "verificado_por",
						model: "Usuario",
						select: "nombre",
					},
					{
						path: "stock",
						model: "Stock",
						populate: [
							{
								path: "producto",
								model: "Producto",
							},
							{
								path: "sucursal",
								model: "Sucursal",
								select: "municipio",
							},
						],
					},
				],
			});

		// Responder al cliente
		res.status(201).json(pedidoCreado);
	} catch (error) {
		// En caso de error, anular la transacción
		await session.abortTransaction();
		session.endSession();

		res.status(500).json({ error: error.message });
	}
};

// READ - GET /pedidos// READ - GET /pedidos
const obtenerPedidos = async (req, res = response) => {
	const session = await mongoose.startSession();
	session.startTransaction();

	let committed = false; // Flag para controlar si ya hicimos commit

	try {
		const pedidos = await Pedido.find({})
			.populate({
				path: "proveedor",
			})
			.populate({
				path: "creado_por",
				select: "nombre",
			})
			.populate({
				path: "productoDetalles.producto",
				populate: [
					{ path: "usuario", select: "nombre" },
					{ path: "categoria", select: "nombre" },
					{ path: "proveedor" },
				],
			})
			.populate({
				path: "movimientos",
				model: "Movimiento",
				populate: [
					{
						path: "usuario",
						model: "Usuario",
						select: "nombre",
					},
					{
						path: "verificado_por",
						model: "Usuario",
						select: "nombre",
					},
					{
						path: "stock",
						model: "Stock",
						populate: [
							{
								path: "producto",
								model: "Producto",
							},
							{
								path: "sucursal",
								model: "Sucursal",
								select: "municipio",
							},
						],
					},
				],
			})
			.sort({ fecha: -1 })
			.session(session);

		if (!pedidos || pedidos.length === 0) {
			await session.abortTransaction();
			session.endSession();
			return res.status(404).json({
				msg: "No hay pedidos disponibles",
				total: 0,
			});
		}

		await session.commitTransaction();
		committed = true; // Indicamos que el commit fue exitoso
		session.endSession();

		res.json({ pedidos, total: pedidos.length }); // Agregado el total directamente
	} catch (error) {
		if (!committed) {
			// Solo hacemos abort si no hicimos commit
			await session.abortTransaction();
		}
		session.endSession();
		res.status(500).json({ error: error.message });
	}
};

// UPDATE - PUT /pedidos/:id
const actualizarPedido = async (req, res = response) => {
	const id = req.params.id;
	const updateData = req.body;

	try {
		// Validar los datos aquí, si es necesario

		// Actualiza el pedido
		const pedido = await Pedido.findByIdAndUpdate(id, updateData, {
			new: true,
			runValidators: true, // Esto hará que Mongoose ejecute cualquier validador definido en el esquema durante la actualización
		}).populate(/* tus campos para populate si los necesitas */);

		if (!pedido) {
			return res.status(404).json({ msg: "Pedido no encontrado" });
		}

		res.json(pedido);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// DELETE - DELETE /pedidos/:id
const eliminarPedido = async (req, res = response) => {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const pedido = await Pedido.findByIdAndDelete(req.params.id).session(
			session
		);

		if (!pedido) {
			await session.abortTransaction();
			session.endSession();
			return res.status(404).json({ msg: "Pedido no encontrado" });
		}

		await session.commitTransaction();
		session.endSession();

		res.json(pedido);
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		res.status(400).json({ error: error.message });
	}
};

module.exports = {
	crearPedido,
	obtenerPedido,
	obtenerPedidos,
	obtenerProductosReservados,
	actualizarPedido,
	eliminarPedido,
	crearMovimientos,
};
