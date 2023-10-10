const { response } = require("express");
const { Movimiento, Stock, Cotizacion } = require("../models");
const axios = require("axios");
const accountSid = "AC56ebeff77124d087f12a859d2b410d5c";
const authToken = process.env.WHATSAPP_TOKEN;
const client = require("twilio")(accountSid, authToken);

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

		// Verifica si el campo pedido no es null
		if (movimiento.pedido !== null) {
			// Busca todas las cotizaciones donde el producto está reservado
			const cotizaciones = await Cotizacion.find({
				"productos.producto": movimiento.stock.producto._id,
				"productos.reservado": true,
			}).populate("cliente", "telefono"); // Asume que el número de WhatsApp está almacenado en el cliente

			// Enviar un mensaje de WhatsApp a los clientes que han reservado el producto
			for (const cotizacion of cotizaciones) {
				const message = `El producto ${movimiento.stock.producto.nombre} ahora está disponible para la compra.`;
				console.log(
					`Enviando mensaje a cliente con número ${cotizacion.cliente.telefono}: ${message}`
				);

				// Envía el mensaje usando Twilio
				await sendMessageTwilio(cotizacion.cliente.telefono, message);
			}
		}

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

const sendMessageTwilio = async (phoneNumber, message) => {
	try {
		await client.messages.create({
			body: message,
			from: "whatsapp:+14155238886", // Este es el número de teléfono de Twilio
			to: `whatsapp:+591${phoneNumber}`,
		});

		console.log(`Mensaje enviado a ${phoneNumber}`);
	} catch (error) {
		console.log("Error al enviar el mensaje:", error);
	}
};

module.exports = {
	obtenerEntradas,
	obtenerEntrada,
	actualizarEntrada,
	crearEntrada,
};
