const Venta = require("../models/venta");
const Movimiento = require("../models/movimiento");

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

module.exports = { obtenerVentas };

const crearVenta = async (req, res) => {
	const { usuario, cotizacion, movimientos } = req.body;

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		// Crear la venta
		const venta = new Venta({ usuario, cotizacion });
		await venta.save({ session });

		// Crear los movimientos
		for (let movimientoData of movimientos) {
			const movimiento = new Movimiento({
				...movimientoData,
				venta: venta._id,
			});
			await movimiento.save({ session });
			venta.movimientos.push(movimiento._id);
		}

		await venta.save({ session });

		await session.commitTransaction();
		session.endSession();

		res.status(200).json({
			message: "Venta y movimientos creados con éxito",
			venta,
		});
	} catch (error) {
		// Abort the transaction in case of error
		await session.abortTransaction();
		session.endSession();

		res.status(500).json({
			message: "Ocurrió un error al crear la venta y los movimientos",
			error,
		});
	}
};

module.exports = { crearVenta, obtenerVentas };
