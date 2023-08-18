const { Movimiento } = require("../models");
const { Producto } = require("../models");
const { Stock } = require("../models");

const obtenerMovimientos = async (req, res = response) => {
	//const { limite = 10, desde = 0 } = req.query;
	const query = { estado: true };

	const [total, movimientos] = await Promise.all([
		Movimiento.countDocuments(query),
		Movimiento.find(query)
			.sort({ fecha: -1 })
			.populate("usuario", "nombre")
			.populate({
				path: "stock",
				populate: [
					{
						path: "producto",
						model: "Producto",
						select: "nombre img",
					},
					{
						path: "sucursal",
						model: "Sucursal",
						select: "definicion",
					},
				],
			})
			.populate({
				path: "verificado_por",
				model: "Usuario",
				select: "nombre",
			}), // Modificar esta línea para incluir la referencia correcta al modelo
		//.skip(Number(desde))
		//.limit(Number(limite)),
	]);

	res.json({
		total,
		movimientos,
	});
};
const obtenerMovimientosPorVenta = async (req, res = response) => {
	const { ventaId } = req.params; // Suponiendo que envías el ID de la venta como un parámetro en la URL

	try {
		const movimientos = await Movimiento.find({ venta: ventaId })
			.sort({ fecha: -1 })
			.populate("usuario", "nombre")
			.populate({
				path: "stock",
				populate: [
					{
						path: "producto",
						model: "Producto",
						select: "nombre img",
					},
					{
						path: "sucursal",
						model: "Sucursal",
						select: "definicion",
					},
				],
			})
			.populate({
				path: "verificado_por",
				model: "Usuario",
				select: "nombre",
			});

		res.json({
			total: movimientos.length,
			movimientos,
		});
	} catch (error) {
		res.status(500).json({
			msg: "Ocurrió un error al obtener los movimientos por venta",
			error,
		});
	}
};

const buscarMovimientos = async (req, res = response) => {
	const nombreProducto = req.query.nombreProducto;

	// Primero encontrar los productos cuyo nombre coincide con el término de búsqueda
	const productos = await Producto.find({
		nombre: { $regex: nombreProducto, $options: "i" },
	});

	// Extraer los IDs de los productos
	const productIds = productos.map((producto) => producto._id);

	// Buscar stocks relacionados a los productos
	const stocks = await Stock.find({ producto: { $in: productIds } });

	// Extraer los IDs de los stocks
	const stockIds = stocks.map((stock) => stock._id);

	const query = {
		estado: true,
		stock: { $in: stockIds },
	};

	const [total, movimientos] = await Promise.all([
		Movimiento.countDocuments(query),
		Movimiento.find(query)
			.sort({ fecha: -1 })
			.populate("usuario", "nombre")
			.populate({
				path: "stock",
				populate: [
					{
						path: "producto",
						model: "Producto",
						select: "nombre img",
					},
					{
						path: "sucursal",
						model: "Sucursal",
						select: "definicion",
					},
				],
			})
			.populate({
				path: "verificado_por",
				model: "Usuario",
				select: "nombre",
			}),
	]);

	res.json({
		total,
		movimientos,
	});
};

module.exports = {
	obtenerMovimientos,
	buscarMovimientos,
	obtenerMovimientosPorVenta,
};
