const { response } = require("express");
const { Categoria } = require("../models");

const obtenerCategorias = async (req, res = response) => {
	const query = { estado: true };

	const [total, categorias] = await Promise.all([
		Categoria.countDocuments(query),
		Categoria.find(query).populate("usuario", "nombre"),
	]);

	res.json({
		total,
		categorias,
	});
};

const obtenerCategoria = async (req, res = response) => {
	const { id } = req.params;
	const categoria = await Categoria.findById(id).populate("usuario", "nombre");

	res.json(categoria);
};

const crearCategoria = async (req, res = response) => {
  const { dimensiones, acabado, material, precioCaja, unidadesPorCaja } = req.body;

  const nombre = `${material[0].toUpperCase()}${dimensiones.replace(/[^0-9]/g, "")}${acabado[0].toUpperCase()}${unidadesPorCaja}`;

  const categoriaDB = await Categoria.findOne({ nombre });

  if (categoriaDB) {
    return res.status(400).json({
      msg: `La categoria ${categoriaDB.nombre}, ya existe`,
    });
  }

  // Calcular precio por unidad
  const precioPorUnidad = Math.ceil((precioCaja / unidadesPorCaja) * 1.1);

  // Generar la data a guardar
  const data = {
    nombre,
    dimensiones,
    acabado,
    material,
    precioCaja,
    unidadesPorCaja,
    precioPorUnidad,
    usuario: req.usuario._id,
  };

  const categoria = new Categoria(data);

  // Guardar DB
  await categoria.save();

  await categoria.populate("usuario", "nombre").execPopulate();

  res.status(201).json(categoria);
};


const actualizarCategoria = async (req, res = response) => {
	const { id } = req.params;
	const { estado, usuario, ...data } = req.body;

	data.usuario = req.usuario._id;

	const categoria = await Categoria.findByIdAndUpdate(id, data, { new: true });

	res.json(categoria);
};

const borrarCategoria = async (req, res = response) => {
	const { id } = req.params;
	const categoriaBorrada = await Categoria.findByIdAndUpdate(
		id,
		{ estado: false },
		{ new: true }
	);

	res.json(categoriaBorrada);
};

module.exports = {
	crearCategoria,
	obtenerCategorias,
	obtenerCategoria,
	actualizarCategoria,
	borrarCategoria,
};
