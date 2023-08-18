const { Factura } = require("../models");

const obtenerFacturas = async (req, res) => {
	const { limite = 5, desde = 0 } = req.query;
	const query = { estado: true };

	const [total, facturas] = await Promise.all([
		Factura.countDocuments(query),
		Factura.find(query)
			.populate("usuario", "nombre")
			.populate("cliente", "nombre")
			.skip(Number(desde))
			.limit(Number(limite)),
	]);

	res.json({
		total,
		facturas,
	});
};

