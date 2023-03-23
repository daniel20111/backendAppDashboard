const { response } = require("express");
const { Movimiento } = require("../models");

const obtenerMovimientos = async (req, res = response) => {
	//const { limite = 10, desde = 0 } = req.query;
	const query = { estado: true };

	const [total, movimientos] = await Promise.all([
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
						select: "definicion",
					},
				],
			}),
		//.skip(Number(desde))
		//.limit(Number(limite)),
	]);

	res.json({
		total,
		movimientos,
	});
};

module.exports = {
	obtenerMovimientos,
};
