import { 
  Document, Packer, Paragraph, TextRun, HeadingLevel, 
  AlignmentType, convertInchesToTwip, UnderlineType, 
  Table, TableRow, TableCell, BorderStyle, WidthType 
} from 'docx';
import { saveAs } from 'file-saver';
import { deterministicShuffle } from './shuffle.js';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// Helpers para crear estilos rápidos
function createInstruction(text) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({ text: "Instrucción: ", bold: true, italics: true, color: "555555" }),
      new TextRun({ text: text, italics: true, color: "555555" })
    ]
  });
}

function createQuestionHeader(num, text) {
  return new Paragraph({
    spacing: { before: 300, after: 100 },
    keepNext: true,
    children: [
      new TextRun({ text: `${num}. `, bold: true, size: 24 }),
      new TextRun({ text: text || 'Pregunta sin texto', bold: true, size: 24 })
    ]
  });
}

function createEmptyBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0 },
    bottom: { style: BorderStyle.NONE, size: 0 },
    left: { style: BorderStyle.NONE, size: 0 },
    right: { style: BorderStyle.NONE, size: 0 },
  };
}

/**
 * Exportar a Word (.docx) con Calidad Editorial Académica
 */
export async function exportToWord(actividades, tema, grado) {
  const children = [];

  // --- CABECERA ACADÉMICA ---
  children.push(
    new Paragraph({
      text: (tema || 'Evaluación Académica').toUpperCase(),
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Tabla para organizar los datos del estudiante
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: createEmptyBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            borders: createEmptyBorders(),
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Nombre del estudiante: ", bold: true }),
                  new TextRun({ text: "_______________________________________" })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            borders: createEmptyBorders(),
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Fecha: ", bold: true }),
                  new TextRun({ text: "________________" })
                ]
              })
            ]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            borders: createEmptyBorders(),
            children: [
              new Paragraph({
                spacing: { before: 200 },
                children: [
                  new TextRun({ text: "Grado / Curso: ", bold: true }),
                  new TextRun({ text: grado ? `${grado} ________` : "_____________________" })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            borders: createEmptyBorders(),
            children: [
              new Paragraph({
                spacing: { before: 200 },
                children: [
                  new TextRun({ text: "Calificación: ", bold: true }),
                  new TextRun({ text: "________ / 10" })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
  
  children.push(headerTable);
  
  children.push(
    new Paragraph({
      spacing: { before: 400, after: 400 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } }
    })
  );

  // --- PREGUNTAS (10 TIPOS SOPORTADOS) ---
  actividades.forEach((act, index) => {
    const tipo = act.tipo || 'seleccion_clasica';
    const num = index + 1;

    // 1. Selección Clásica
    if (tipo === 'seleccion_clasica') {
      children.push(createQuestionHeader(num, act.pregunta));
      if (act.opciones && Array.isArray(act.opciones)) {
        act.opciones.forEach((opcion, i) => {
          children.push(
            new Paragraph({
              spacing: { before: 60, after: 60 },
              indent: { left: convertInchesToTwip(0.4) },
              children: [
                new TextRun({ text: `${LETRAS[i]}) `, bold: true }),
                new TextRun({ text: opcion })
              ]
            })
          );
        });
      }
    } 
    
    // 2. Detective de Texto
    else if (tipo === 'detective_texto') {
      children.push(createQuestionHeader(num, act.pregunta));
      // Pasaje enmarcado
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 100 },
          indent: { left: convertInchesToTwip(0.4), right: convertInchesToTwip(0.4) },
          border: {
            left: { style: BorderStyle.SINGLE, size: 12, color: "666666" }
          },
          children: [
            new TextRun({ text: `"${act.pasaje}"`, italics: true, color: "333333" })
          ]
        })
      );
      if (act.opciones && Array.isArray(act.opciones)) {
        act.opciones.forEach((opcion, i) => {
          children.push(
            new Paragraph({
              spacing: { before: 60, after: 60 },
              indent: { left: convertInchesToTwip(0.4) },
              children: [
                new TextRun({ text: `${LETRAS[i]}) `, bold: true }),
                new TextRun({ text: opcion })
              ]
            })
          );
        });
      }
    }

    // 3. Verdad o Mito / Real o Inventado
    else if (tipo === 'verdad_mito' || tipo === 'real_inventado') {
      const a = tipo === 'verdad_mito' ? 'Verdad' : 'Real';
      const b = tipo === 'verdad_mito' ? 'Mito' : 'Inventado';
      children.push(createQuestionHeader(num, act.enunciado));
      children.push(
        new Paragraph({
          indent: { left: convertInchesToTwip(0.4) },
          spacing: { before: 100, after: 100 },
          children: [
            new TextRun({ text: `[   ] ${a}        `, bold: true }),
            new TextRun({ text: `[   ] ${b}`, bold: true }),
          ]
        })
      );
    }

    // 4. Caza Intruso
    else if (tipo === 'caza_intruso') {
      children.push(createQuestionHeader(num, act.instruccion));
      children.push(createInstruction("Encierra en un círculo la palabra que no pertenece al grupo."));
      if (act.elementos && Array.isArray(act.elementos)) {
        children.push(
          new Paragraph({
            indent: { left: convertInchesToTwip(0.4) },
            spacing: { before: 100, after: 100 },
            children: [
              new TextRun({ text: act.elementos.join('       ·       '), size: 24 })
            ]
          })
        );
      }
    }

    // 5. Rompecabezas / Paso a Paso
    else if (tipo === 'rompecabezas_ideas' || tipo === 'paso_a_paso') {
      children.push(createQuestionHeader(num, act.instruccion));
      children.push(createInstruction("Asigna un número del 1 en adelante para ordenar los siguientes elementos correctamente."));
      const items = tipo === 'rompecabezas_ideas' ? act.fragmentos : act.pasos;
      if (items && Array.isArray(items)) {
        // Barajar para el estudiante
        const barajados = deterministicShuffle(items, `word-${num}`);
        barajados.forEach(item => {
          children.push(
            new Paragraph({
              spacing: { before: 100, after: 100 },
              indent: { left: convertInchesToTwip(0.4) },
              children: [
                new TextRun({ text: "[   ]  ", bold: true }),
                new TextRun({ text: item.item ? item.item : item })
              ]
            })
          );
        });
      }
    }

    // 6. Parejas Lógicas
    else if (tipo === 'parejas_logicas') {
      children.push(createQuestionHeader(num, act.instruccion));
      children.push(createInstruction("Escribe la letra correspondiente de la columna derecha en la columna izquierda."));
      if (act.pares && Array.isArray(act.pares)) {
        const derechas = deterministicShuffle(act.pares.map(p => p.derecha), `word-parejas-${num}`);
        
        const rows = [];
        const maxLen = Math.max(act.pares.length, derechas.length);
        for (let i = 0; i < maxLen; i++) {
          const izq = act.pares[i] ? `${i + 1}. [   ] ${act.pares[i].izquierda}` : '';
          const der = derechas[i] ? `${LETRAS[i]}) ${derechas[i].item ? derechas[i].item : derechas[i]}` : '';
          
          rows.push(
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: createEmptyBorders(),
                  children: [new Paragraph({ text: izq, spacing: { after: 150 } })]
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: createEmptyBorders(),
                  children: [new Paragraph({ text: der, spacing: { after: 150 } })]
                })
              ]
            })
          );
        }
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: createEmptyBorders(),
            rows: rows
          })
        );
      }
    }

    // 7. Clasificador
    else if (tipo === 'clasificador') {
      children.push(createQuestionHeader(num, act.instruccion));
      if (act.categorias && Array.isArray(act.categorias)) {
        const catNombres = act.categorias.map(c => c.nombre).join('   |   ');
        children.push(createInstruction(`Escribe a qué categoría pertenece cada elemento:\n${catNombres}`));
        
        const todos = act.categorias.flatMap(c => c.items || []);
        const barajados = deterministicShuffle(todos, `word-clasif-${num}`);
        
        barajados.forEach(item => {
          children.push(
            new Paragraph({
              spacing: { before: 100, after: 100 },
              indent: { left: convertInchesToTwip(0.4) },
              children: [
                new TextRun({ text: "_________________________ :  " }),
                new TextRun({ text: item.item ? item.item : item })
              ]
            })
          );
        });
      }
    }

    // 8. Palabras Perdidas
    else if (tipo === 'palabras_perdidas') {
      children.push(createQuestionHeader(num, "Completa el siguiente texto:"));
      children.push(createInstruction("Utiliza las palabras del banco para rellenar los espacios en blanco."));
      
      // Banco de palabras
      if (act.banco && Array.isArray(act.banco)) {
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 200 },
            indent: { left: convertInchesToTwip(0.4), right: convertInchesToTwip(0.4) },
            border: {
              top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
              left: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
              right: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" }
            },
            children: [
              new TextRun({ text: " Banco de palabras: ", bold: true }),
              new TextRun({ text: act.banco.join('   -   ') })
            ]
          })
        );
      }

      // Oración
      const oracion = (act.oracion || '').split('[___]').join(' ___________________ ');
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 100 },
          indent: { left: convertInchesToTwip(0.4) },
          children: [
            new TextRun({ text: oracion, size: 24 })
          ]
        })
      );
    }
  });

  // --- CREACIÓN DEL DOCUMENTO ---
  const doc = new Document({
    creator: "EduMaster Pro",
    title: tema || "Guía de Estudio",
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${(tema || 'Cuestionario').substring(0, 30).trim()}-Impresion.docx`);
}
