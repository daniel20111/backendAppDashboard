const Venta = require("../models/venta");
const Movimiento = require("../models/movimiento");
const Cotizacion = require("../models/cotizacion");
const Stock = require("../models/stock");
const Traspaso = require("../models/traspaso");
const mongoose = require("mongoose");

const obtenerVentas = async (req, res) => {
	try {
		// Buscar todas las ventas en la base de datos
		const ventas = await Venta.find({})
			.populate("usuario", "nombre")
			.populate("cotizacion")
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
						path: "stock",
						model: "Stock",
					},
				],
			});

		// Calcular el total de ventas
		const total = ventas.length;

		// Devolver una respuesta exitosa con el listado de ventas y el total
		res.status(200).json({
			message: "Ventas obtenidas con éxito",
			ventas,
			total,
		});
	} catch (error) {
		// Manejar posibles errores y devolver un mensaje de error
		res.status(500).json({
			message: "Ocurrió un error al obtener las ventas",
			error,
		});
	}
};

// Busca una cotización en la base de datos por su ID
async function buscarCotizacion(id, session) {
	const cotizacionData = await Cotizacion.findById(id).session(session);
	if (!cotizacionData) {
		throw new Error("Cotización no encontrada");
	}
	console.log("Cotización encontrada:", cotizacionData);
	return cotizacionData;
}

// Crea una nueva venta
async function guardarVenta(cotizacion, usuario, session) {
	const venta = new Venta({ usuario, cotizacion });
	await venta.save({ session });
	console.log("Venta creada:", venta);
	return venta;
}

// Busca el stock de un producto en una sucursal específica
async function buscarStock(producto, sucursal, session) {
	const stock = await Stock.findOne({ producto, sucursal }).session(session);
	console.log("Stock encontrado:", stock);
	return stock;
}

// Busca otros stocks de un producto en sucursales diferentes a la especificada
async function buscarOtrosStocks(producto, sucursal, session) {
	const otherStocks = await Stock.find({
		producto,
		sucursal: { $ne: sucursal },
	})
		.sort({ cantidadCajas: -1, cantidadPiezas: -1 })
		.session(session);
	console.log("Otros stocks encontrados:", otherStocks);
	return otherStocks;
}

// Realiza traspasos entre sucursales hasta cubrir la cantidad necesaria
async function realizarTraspasos(
	producto,
	usuario,
	stock,
	venta,
	otherStocks,
	session
) {
	for (let otherStock of otherStocks) {
		if (producto.cantidadCajas <= 0 && producto.cantidadPiezas <= 0) {
			break;
		}

		let traspaso = new Traspaso({
			usuario,
			estado: true,
		});

		await realizarMovimientos(
			producto,
			usuario,
			stock,
			venta,
			otherStock,
			traspaso,
			session
		);

		await traspaso.save({ session });
		console.log("Traspaso guardado:", traspaso);
		await otherStock.save({ session });
		console.log("Stock actualizado:", otherStock);
	}
}

// Realiza los movimientos de entrada y salida necesarios durante un traspaso
async function realizarMovimientos(
	producto,
	usuario,
	stock,
	venta,
	otherStock,
	traspaso,
	session
) {
	// Manejo de cajas
	if (
		producto.cantidadCajas > 0 &&
		otherStock.cantidadCajas - otherStock.reservadoCajas > 0
	) {
		let cantidad = Math.min(
			producto.cantidadCajas,
			otherStock.cantidadCajas - otherStock.reservadoCajas
		);

		let movimientoSalida = new Movimiento({
			usuario,
			cantidadCajas: cantidad,
			cantidadPiezas: 0,
			movimiento: "Salida",
			stock: otherStock._id,
			venta: venta._id, // Referencia a la venta
		});
		await movimientoSalida.save({ session });

		let movimientoEntrada = new Movimiento({
			usuario,
			cantidadCajas: cantidad,
			cantidadPiezas: 0,
			movimiento: "Entrada",
			stock: stock._id,
			venta: venta._id, // Referencia a la venta
		});
		await movimientoEntrada.save({ session });

		traspaso.salidas.push(movimientoSalida._id);
		traspaso.entradas.push(movimientoEntrada._id);

		producto.cantidadCajas -= cantidad;
		otherStock.reservadoCajas += cantidad;
	}

	// Manejo de piezas
	if (
		producto.cantidadPiezas > 0 &&
		otherStock.cantidadPiezas - otherStock.reservadoPiezas > 0
	) {
		let cantidad = Math.min(
			producto.cantidadPiezas,
			otherStock.cantidadPiezas - otherStock.reservadoPiezas
		);

		let movimientoSalida = new Movimiento({
			usuario,
			cantidadCajas: 0,
			cantidadPiezas: cantidad,
			movimiento: "Salida",
			stock: otherStock._id,
			venta: venta._id, // Referencia a la venta
		});
		await movimientoSalida.save({ session });

		let movimientoEntrada = new Movimiento({
			usuario,
			cantidadCajas: 0,
			cantidadPiezas: cantidad,
			movimiento: "Entrada",
			stock: stock._id,
			venta: venta._id, // Referencia a la venta
		});
		await movimientoEntrada.save({ session });

		traspaso.salidas.push(movimientoSalida._id);
		traspaso.entradas.push(movimientoEntrada._id);

		producto.cantidadPiezas -= cantidad;
		otherStock.reservadoPiezas += cantidad;
	}
}

// Crea un movimiento de salida de la venta en la sucursal de origen
async function crearMovimiento(
	cantidadCajas,
	cantidadPiezas,
	usuario,
	stock,
	venta,
	session
) {
	const movimiento = new Movimiento({
		usuario,
		cantidadCajas,
		cantidadPiezas,
		movimiento: "Salida",
		stock: stock._id,
		venta: venta._id, // Referencia a la venta
	});
	await movimiento.save({ session });
	console.log("Movimiento creado:", movimiento);
	return movimiento;
}

// Función principal que maneja la lógica de la creación de ventas
const crearVenta = async (req, res) => {
	const { cotizacion } = req.body;
	const usuario = req.usuario._id;

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const cotizacionData = await buscarCotizacion(cotizacion, session);
		const venta = await guardarVenta(cotizacion, usuario, session);

		for (let producto of cotizacionData.productos) {
			const cantidadOriginalCajas = producto.cantidadCajas;
			const cantidadOriginalPiezas = producto.cantidadPiezas;

			let stock = await buscarStock(
				producto.producto,
				cotizacionData.sucursal,
				session
			);

			if (
				!stock ||
				stock.cantidadCajas - stock.reservadoCajas < producto.cantidadCajas ||
				stock.cantidadPiezas - stock.reservadoPiezas < producto.cantidadPiezas
			) {
				const otherStocks = await buscarOtrosStocks(
					producto.producto,
					cotizacionData.sucursal,
					session
				);
				await realizarTraspasos(
					producto,
					usuario,
					stock,
					venta,
					otherStocks,
					session
				);
			}

			const movimiento = await crearMovimiento(
				cantidadOriginalCajas,
				cantidadOriginalPiezas,
				usuario,
				stock,
				venta,
				session
			);

			venta.movimientos.push(movimiento._id);

			stock.reservadoCajas += cantidadOriginalCajas - producto.cantidadCajas;
			stock.reservadoPiezas += cantidadOriginalPiezas - producto.cantidadPiezas;
			await stock.save({ session });
			console.log("Stock actualizado:", stock);
		}

		await venta.save({ session });
		console.log("Venta actualizada:", venta);

		await session.commitTransaction();
		session.endSession();
		console.log("Transacción confirmada");

		res.status(200).json({
			message: "Venta y movimientos creados con éxito",
			venta,
		});
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		console.log("Ocurrió un error al crear la venta y los movimientos", error);

		res.status(500).json({
			message: "Ocurrió un error al crear la venta y los movimientos",
			error,
		});
	}
};

module.exports = { crearVenta, obtenerVentas };
