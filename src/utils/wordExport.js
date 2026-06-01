import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export async function exportarAWord(actividades, meta = {}) {
  const { titulo = 'Guía de Estudio', grado = '', dificultad = '', docente = '', institucion = '', esClave = false, notas = '' } = meta;

  const children = [];

  // Encabezado
  if (institucion) {
    children.push(new Paragraph({
      children: [new TextRun({ text: institucion, bold: true, size: 24 })],
      alignment: AlignmentType.CENTER
    }));
  }
  
  children.push(new Paragraph({
    text: titulo,
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER
  }));

  const metaText = [grado, dificultad, docente ? `Docente: ${docente}` : ''].filter(Boolean).join(' | ');
  if (metaText) {
    children.push(new Paragraph({
      text: metaText,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }));
  }

  if (esClave) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "— CLAVE DE RESPUESTAS —", bold: true, color: "FF0000" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }));
  }

  if (notas) {
    children.push(new Paragraph({
      text: `Instrucciones: ${notas}`,
      italics: true,
      spacing: { after: 400 }
    }));
  }

  // Actividades
  actividades.forEach((act, index) => {
    const num = index + 1;
    const tipo = act.tipo || 'seleccion_clasica';
    
    // Enunciado
    const enunciadoText = act.pregunta || act.enunciado || act.instruccion || '';
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${num}. `, bold: true }),
        new TextRun({ text: enunciadoText, bold: true })
      ],
      spacing: { before: 200, after: 100 }
    }));

    if (tipo === 'seleccion_clasica') {
      act.opciones.forEach((op, i) => {
        const correcta = esClave && i === act.correcta;
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `    ${LETRAS[i]}) ${op}`, bold: correcta }),
            correcta ? new TextRun({ text: " ✓", bold: true, color: "00A859" }) : new TextRun({ text: "" })
          ]
        }));
      });
    } else if (tipo === 'detective_texto') {
        children.push(new Paragraph({ text: `   Pasaje: ${act.pasaje}`, italics: true }));
        act.opciones.forEach((op, i) => {
            const correcta = esClave && i === act.correcta;
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `    ${LETRAS[i]}) ${op}`, bold: correcta }),
                correcta ? new TextRun({ text: " ✓", bold: true, color: "00A859" }) : new TextRun({ text: "" })
              ]
            }));
          });
    } else if (tipo === 'verdad_mito' || tipo === 'real_inventado') {
        const a = tipo === 'verdad_mito' ? 'Verdad' : 'Real';
        const b = tipo === 'verdad_mito' ? 'Mito' : 'Inventado';
        const valA = tipo === 'verdad_mito' ? 'verdad' : 'real';
        const correctaA = esClave && act.correcto === valA;
        const correctaB = esClave && act.correcto !== valA;
        
        children.push(new Paragraph({
            children: [
                new TextRun({ text: `   [ ] ${a} `, bold: correctaA }),
                correctaA ? new TextRun({ text: "✓  ", bold: true, color: "00A859" }) : new TextRun({ text: "  " }),
                new TextRun({ text: `[ ] ${b} `, bold: correctaB }),
                correctaB ? new TextRun({ text: "✓", bold: true, color: "00A859" }) : new TextRun({ text: "" })
            ]
        }));
    } else {
        // Fallback genérico para los demás tipos para no complicar el archivo
        children.push(new Paragraph({ text: "   (Ver formato en la aplicación para este tipo de pregunta)" }));
        if (esClave) {
            children.push(new Paragraph({
                children: [new TextRun({ text: `   Respuestas / Clave incluida.`, color: "00A859" })]
            }));
        }
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}
