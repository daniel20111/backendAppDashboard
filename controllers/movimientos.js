const { Movimiento } = require("../models");

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

module.exports = {
	obtenerMovimientos,
};
