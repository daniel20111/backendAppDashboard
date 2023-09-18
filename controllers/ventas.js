const Venta = require("../models/venta");
const Movimiento = require("../models/movimiento");
const Cotizacion = require("../models/cotizacion");
const Stock = require("../models/stock");
const Traspaso = require("../models/traspaso");
const Producto = require("../models/producto");
const mongoose = require("mongoose");

const obtenerVentas = async (req, res) => {
	try {
		// Buscar todas las ventas en la base de datos
		const ventas = await Venta.find({})
			.sort({ fecha_venta: -1 })
			.populate("usuario", "nombre")
			.populate({
				path: "cotizacion",
				populate: [
					{
						path: "productos.producto",
						model: "Producto",
						populate: [
							{ path: "usuario", model: "Usuario", select: "nombre" },
							{ path: "categoria", model: "Categoria", select: "nombre" },
						],
					},
					{ path: "cliente", model: "Cliente" },
					{ path: "sucursal", model: "Sucursal", select: "municipio" },
					{ path: "usuario", model: "Usuario", select: "nombre" },
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

//pbtener venta por id
const obtenerVentaPorId = async (req, res) => {
	const { id } = req.params;

	try {
		const venta = await Venta.findById(id)
			.populate("usuario", "nombre")
			.populate({
				path: "cotizacion",
				populate: [
					{
						path: "productos.producto",
						model: "Producto",
						populate: [
							{ path: "usuario", model: "Usuario", select: "nombre" },
							{ path: "categoria", model: "Categoria", select: "nombre" },
						],
					},
					{ path: "cliente", model: "Cliente" },
					{ path: "sucursal", model: "Sucursal", select: "municipio" },
					{ path: "usuario", model: "Usuario", select: "nombre" },
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

		if (!venta) {
			return res.status(404).json({
				message: "No se encontró la venta",
			});
		}

		res.status(200).json(venta);
	} catch (error) {
		res.status(500).json({
			message: "Ocurrió un error al obtener la venta",
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
	return cotizacionData;
}

// Crea una nueva venta
async function guardarVenta(cotizacion, usuario, session) {
	const venta = new Venta({ usuario, cotizacion });
	await venta.save({ session });
	return venta;
}

// Busca el stock de un producto en una sucursal específica
async function buscarStock(producto, sucursal, session) {
	const stock = await Stock.findOne({ producto, sucursal }).session(session);
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
	return otherStocks;
}

// Realiza los traspasos necesarios para completar la venta

async function realizarTraspasos(
	producto,
	usuario,
	stock,
	traspaso,
	otherStocks,
	session
) {
	console.log("=== Inicio de la función realizarTraspasos ===");

	console.log(producto.cantidadCajas);
	console.log(stock.cantidadCajas);
	console.log(stock.reservadoCajas);

	console.log(producto.cantidadPiezas);
	console.log(stock.cantidadPiezas);
	console.log(stock.reservadoPiezas);

	let stockReservadoDisponibleCajas =
		stock.entranteCajas - stock.reservadoCajas;

	let stockReservadoDisponiblePiezas =
		stock.entrantePiezas - stock.reservadoPiezas;

	let faltanteCajas =
		producto.cantidadCajas -
		(stock.cantidadCajas - stockReservadoDisponibleCajas);

	let faltantePiezas =
		producto.cantidadPiezas -
		(stock.cantidadPiezas - stockReservadoDisponiblePiezas);

	console.log(
		`Calculando faltantes: Cajas=${faltanteCajas}, Piezas=${faltantePiezas}`
	);

	let saldoCajas = faltanteCajas;
	let saldoPiezas = faltantePiezas;

	console.log(`Saldo inicial: Cajas=${saldoCajas}, Piezas=${saldoPiezas}`);

	for (let otherStock of otherStocks) {
		console.log("=== Inicio del ciclo for para otherStocks ===");

		if (faltanteCajas <= 0 && faltantePiezas <= 0) {
			console.log("No hay faltantes. Rompiendo el ciclo.");
			break;
		}

		// Manejo de cajas
		if (
			faltanteCajas > 0 &&
			otherStock.cantidadCajas - otherStock.reservadoCajas > 0
		) {
			let cantidad = Math.min(
				faltanteCajas,
				otherStock.cantidadCajas - otherStock.reservadoCajas
			);
			console.log(`Manejando cajas. Cantidad a mover: ${cantidad}`);

			let movimientoSalida = new Movimiento({
				usuario,
				cantidadCajas: cantidad,
				cantidadPiezas: 0,
				movimiento: "SALIDA",
				stock: otherStock._id,
				traspaso: traspaso._id,
			});
			await movimientoSalida.save({ session });

			let movimientoEntrada = new Movimiento({
				usuario,
				cantidadCajas: cantidad,
				cantidadPiezas: 0,
				movimiento: "ENTRADA",
				stock: stock._id,
				traspaso: traspaso._id,
			});
			await movimientoEntrada.save({ session });

			traspaso.salidas.push(movimientoSalida._id);
			traspaso.entradas.push(movimientoEntrada._id);

			faltanteCajas -= cantidad;
			otherStock.reservadoCajas += cantidad;

			console.log(`Faltante de cajas después del movimiento: ${faltanteCajas}`);
			console.log(
				`Reservado de cajas después del movimiento: ${otherStock.reservadoCajas}`
			);
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
			console.log(`Manejando piezas. Cantidad a mover: ${cantidad}`);

			let movimientoSalida = new Movimiento({
				usuario,
				cantidadCajas: 0,
				cantidadPiezas: cantidad,
				movimiento: "SALIDA",
				stock: otherStock._id,
				traspaso: traspaso._id,
			});
			await movimientoSalida.save({ session });

			let movimientoEntrada = new Movimiento({
				usuario,
				cantidadCajas: 0,
				cantidadPiezas: cantidad,
				movimiento: "ENTRADA",
				stock: stock._id,
				traspaso: traspaso._id,
			});
			await movimientoEntrada.save({ session });

			traspaso.salidas.push(movimientoSalida._id);
			traspaso.entradas.push(movimientoEntrada._id);

			faltantePiezas -= cantidad;
			otherStock.reservadoPiezas += cantidad;

			console.log(
				`Faltante de piezas después del movimiento: ${faltantePiezas}`
			);
			console.log(
				`Reservado de piezas después del movimiento: ${otherStock.reservadoPiezas}`
			);
		}

		await otherStock.save({ session });

		console.log("=== Fin del ciclo for para otherStocks ===");
	}

	// Actualiza las reservas en el stock original si hubo traspasos
	if (stock.cantidadCajas === 0 || stock.cantidadPiezas === 0) {
		stock.entranteCajas += producto.cantidadCajas;
		stock.entrantePiezas += producto.cantidadPiezas;
	} else {
		stock.entranteCajas += saldoCajas;
		stock.entrantePiezas += saldoPiezas;
	}
	await stock.save({ session });
	console.log("Stock después de guardar:", JSON.stringify(stock));

	console.log("=== Fin de la función realizarTraspasos ===");
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
		venta: venta._id,
	});
	await movimiento.save({ session });
	return movimiento;
}

const crearVenta = async (req, res) => {
	const { cotizacion } = req.body;
	const usuario = req.usuario._id;

	try {
		// Guardar la venta
		const venta = await guardarVenta(cotizacion, usuario);

		// Actualizar el campo vendido de la cotización a true
		await Cotizacion.findByIdAndUpdate(cotizacion, { vendido: true });

		res.status(200).json({
			message: "Venta creada con éxito",
			venta,
		});
	} catch (error) {
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

		let traspaso = new Traspaso({
			usuario,
			estado: true,
		});

		for (let producto of cotizacionData.productos) {
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
					traspaso,
					otherStocks,
					session
				);
			}

			const movimiento = await crearMovimiento(
				producto.cantidadCajas,
				producto.cantidadPiezas,
				usuario,
				stock,
				venta,
				session
			);

			venta.movimientos.push(movimiento._id);

			stock.reservadoCajas += producto.cantidadCajas;
			stock.reservadoPiezas += producto.cantidadPiezas;
			await stock.save({ session });
		}

		venta.estado = "Pagado";
		await venta.save({ session });

		if (traspaso.entradas.length > 0 || traspaso.salidas.length > 0) {
			await traspaso.save({ session });
		}

		await session.commitTransaction();
		session.endSession();

		const ventaCreada = await Venta.findById(venta._id)
			.populate("usuario", "nombre")
			.populate({
				path: "cotizacion",
				populate: [
					{
						path: "productos.producto",
						model: "Producto",
						populate: [
							{ path: "usuario", model: "Usuario", select: "nombre" },
							{ path: "categoria", model: "Categoria", select: "nombre" },
						],
					},
					{ path: "cliente", model: "Cliente" },
					{ path: "sucursal", model: "Sucursal", select: "municipio" },
					{ path: "usuario", model: "Usuario", select: "nombre" },
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

		res.status(200).json(ventaCreada);
	} catch (error) {
		await session.abortTransaction();
		session.endSession();

		res.status(500).json({
			message: "Ocurrió un error al pagar la venta y crear los movimientos",
			error,
		});
	}
};

module.exports = { crearVenta, obtenerVentas, pagarVenta, obtenerVentaPorId };
