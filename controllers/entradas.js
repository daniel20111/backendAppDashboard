const { response } = require("express");
const { Movimiento, Stock } = require("../models");

const obtenerEntradas = async (req, res = response) => {
	const query = { estado: true, movimiento: "ENTRADA" };

	const [total, entradas] = await Promise.all([
		Movimiento.countDocuments(query),
		Movimiento.find(query)
			.sort("-fecha")
			.populate("usuario", "nombre")
			.populate({
				path: "stock",
				populate: [
					{
						path: "producto",
						model: "Producto",
						select: "nombre",
					},
					{
						path: "sucursal",
						model: "Sucursal",
						select: "municipio",
					},
				],
			}),
	]);

	res.json({
		total,
		entradas,
	});
};

const obtenerEntrada = async (req, res = response) => {
	const { id } = req.params;

	const entrada = await Movimiento.findById(id)
		.populate("usuario", "nombre")
		.populate({
			path: "stock",
			populate: [
				{
					path: "producto",
					model: "Producto",
					select: "nombre",
				},
				{
					path: "sucursal",
					model: "Sucursal",
					select: "municipio",
				},
			],
		})
		.populate("verificado_por", "nombre");

	res.json(entrada);
};

const crearEntrada = async (req, res = response) => {
	const { estado, usuario, ...body } = req.body;

	const data = {
		...body,
		usuario: req.usuario._id,
		cantidad: body.cantidad,
		movimiento: "ENTRADA",
	};

	const entrada = new Movimiento(data);

	const nuevaEntrada = await entrada.save();

	const stock = await Stock.findById(nuevaEntrada.stock._id);

	stock.entranteCajas += nuevaEntrada.cantidadCajas;
	stock.entrantePiezas += nuevaEntrada.cantidadPiezas;

	await stock.save();

	await nuevaEntrada
		.populate("usuario", "nombre")
		.populate({
			path: "stock",
			populate: [
				{
					path: "producto",
					model: "Producto",
					select: "nombre",
				},
				{
					path: "sucursal",
					model: "Sucursal",
					select: "municipio",
				},
			],
		})
		.execPopulate();

	res.status(201).json(nuevaEntrada);
};

const actualizarEntrada = async (req, res = response) => {
	const session = await Stock.startSession();
	session.startTransaction();

	try {
		const { id } = req.params;
		const { estado, usuario, ...data } = req.body;

		data.verificado_por = req.usuario._id;
		data.verificacion = "VERIFICADO";
		data.fecha_verificacion = Date.now();

		const movimiento = await Movimiento.findByIdAndUpdate(id, data, {
			new: true,
			session,
		});

		const stock = await Stock.findById(movimiento.stock._id).session(session);

		const saldoCajas = stock.cantidadCajas + movimiento.cantidadCajas;
		const saldoPiezas = stock.cantidadPiezas + movimiento.cantidadPiezas;

		const historialItem = {
			fecha: new Date(),
			cantidadCajas: saldoCajas,
			cantidadPiezas: saldoPiezas,
		};

		stock.historial.push(historialItem);
		stock.cantidadCajas = saldoCajas;
		stock.cantidadPiezas = saldoPiezas;
		stock.entranteCajas -= movimiento.cantidadCajas;
		stock.entrantePiezas -= movimiento.cantidadPiezas;

		await stock.save({ session });

		await movimiento
			.populate("usuario", "nombre")
			.populate({
				path: "stock",
				populate: [
					{
						path: "producto",
						model: "Producto",
						select: "nombre",
					},
					{
						path: "sucursal",
						model: "Sucursal",
						select: "municipio",
					},
				],
			})
			.execPopulate();

		await session.commitTransaction();
		session.endSession();

		res.json(movimiento);
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		console.error("Error al actualizar la entrada:", error);
		res.status(500).json({
			msg: "Ocurrió un error al actualizar la entrada. Por favor, inténtalo de nuevo.",
		});
	}
};



module.exports = {
	obtenerEntradas,
	obtenerEntrada,
	actualizarEntrada,
	crearEntrada,
};
