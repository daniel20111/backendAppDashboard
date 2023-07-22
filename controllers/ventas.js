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
			.populate({
				path: "cotizacion",
				populate: {
					path: "productos.producto",
					model: "Producto",
				},
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
						path: "stock",
						model: "Stock",
						populate: {
							path: "producto",
							model: "Producto",
						},
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

async function realizarTraspasos(
	producto,
	usuario,
	stock,
	venta,
	otherStocks,
	session
) {
	let faltanteCajas =
		producto.cantidadCajas - (stock.cantidadCajas - stock.reservadoCajas);
	let faltantePiezas =
		producto.cantidadPiezas - (stock.cantidadPiezas - stock.reservadoPiezas);

	for (let otherStock of otherStocks) {
		if (faltanteCajas <= 0 && faltantePiezas <= 0) {
			break;
		}

		let traspaso = new Traspaso({
			usuario,
			estado: true,
		});

		// Manejo de cajas
		if (
			faltanteCajas > 0 &&
			otherStock.cantidadCajas - otherStock.reservadoCajas > 0
		) {
			let cantidad = Math.min(
				faltanteCajas,
				otherStock.cantidadCajas - otherStock.reservadoCajas
			);

			let movimientoSalida = new Movimiento({
				usuario,
				cantidadCajas: cantidad,
				cantidadPiezas: 0,
				movimiento: "SALIDA",
				stock: otherStock._id,
				venta: venta._id,
			});
			await movimientoSalida.save({ session });

			let movimientoEntrada = new Movimiento({
				usuario,
				cantidadCajas: cantidad,
				cantidadPiezas: 0,
				movimiento: "ENTRADA",
				stock: stock._id,
				venta: venta._id,
			});
			await movimientoEntrada.save({ session });

			traspaso.salidas.push(movimientoSalida._id);
			traspaso.entradas.push(movimientoEntrada._id);

			faltanteCajas -= cantidad;
			otherStock.reservadoCajas += cantidad;
		}

		// Manejo de piezas
		if (
			faltantePiezas > 0 &&
			otherStock.cantidadPiezas - otherStock.reservadoPiezas > 0
		) {
			let cantidad = Math.min(
				faltantePiezas,
				otherStock.cantidadPiezas - otherStock.reservadoPiezas
			);

			let movimientoSalida = new Movimiento({
				usuario,
				cantidadCajas: 0,
				cantidadPiezas: cantidad,
				movimiento: "SALIDA",
				stock: otherStock._id,
				venta: venta._id,
			});
			await movimientoSalida.save({ session });

			let movimientoEntrada = new Movimiento({
				usuario,
				cantidadCajas: 0,
				cantidadPiezas: cantidad,
				movimiento: "ENTRADA",
				stock: stock._id,
				venta: venta._id,
			});
			await movimientoEntrada.save({ session });

			traspaso.salidas.push(movimientoSalida._id);
			traspaso.entradas.push(movimientoEntrada._id);

			faltantePiezas -= cantidad;
			otherStock.reservadoPiezas += cantidad;
		}

		await traspaso.save({ session });
		console.log("Traspaso guardado:", traspaso);
		await otherStock.save({ session });
		console.log("Stock actualizado:", otherStock);
	}

	// Actualiza las reservas en el stock original si hubo traspasos
	if (
		faltanteCajas < producto.cantidadCajas ||
		faltantePiezas < producto.cantidadPiezas
	) {
		stock.reservadoCajas += producto.cantidadCajas - faltanteCajas;
		stock.reservadoPiezas += producto.cantidadPiezas - faltantePiezas;
		await stock.save({ session });
		console.log("Stock de origen actualizado con nuevas reservas:", stock);
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
			movimiento: "SALIDA",
			stock: otherStock._id,
			venta: venta._id, // Referencia a la venta
		});
		await movimientoSalida.save({ session });

		let movimientoEntrada = new Movimiento({
			usuario,
			cantidadCajas: cantidad,
			cantidadPiezas: 0,
			movimiento: "ENTRADA",
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
			movimiento: "SALIDA",
			stock: otherStock._id,
			venta: venta._id, // Referencia a la venta
		});
		await movimientoSalida.save({ session });

		let movimientoEntrada = new Movimiento({
			usuario,
			cantidadCajas: 0,
			cantidadPiezas: cantidad,
			movimiento: "ENTRADA",
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
		movimiento: "SALIDA",
		stock: stock._id,
		venta: venta._id, // Referencia a la venta
	});
	await movimiento.save({ session });
	console.log("Movimiento creado:", movimiento);
	return movimiento;
}

const crearVenta = async (req, res) => {
	const { cotizacion } = req.body;
	const usuario = req.usuario._id;

	try {
		// Solo necesitas una cotización y crear una venta
		// No es necesario iniciar una sesión de transacción aquí
		const cotizacionData = await buscarCotizacion(cotizacion);
		const venta = await guardarVenta(cotizacion, usuario);

		res.status(200).json({
			message: "Venta creada con éxito",
			venta,
		});
	} catch (error) {
		console.log("Ocurrió un error al crear la venta", error);

		res.status(500).json({
			message: "Ocurrió un error al crear la venta",
			error,
		});
	}
};

const pagarVenta = async (req, res) => {
	const { id } = req.params;
	const usuario = req.usuario._id;

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const venta = await Venta.findById(id).session(session);
		if (!venta) {
			return res.status(404).json({
				message: "No se encontró la venta",
			});
		}

		const cotizacionData = await buscarCotizacion(venta.cotizacion, session);

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

		venta.estado = "Pagado";
		await venta.save({ session });
		console.log("Venta pagada:", venta);

		await session.commitTransaction();
		session.endSession();
		console.log("Transacción confirmada");

		res.status(200).json({
			message: "Venta pagada y movimientos creados con éxito",
			venta,
		});
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		console.log(
			"Ocurrió un error al pagar la venta y crear los movimientos",
			error
		);

		res.status(500).json({
			message: "Ocurrió un error al pagar la venta y crear los movimientos",
			error,
		});
	}
};

module.exports = { crearVenta, obtenerVentas, pagarVenta };
