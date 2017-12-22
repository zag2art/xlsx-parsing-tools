const	expat = require('node-expat')
const	{ EventEmitter } = require('events')

function alphaNum(name) {
  let result = 0
  let multiplier = 1
  for (let i = name.length - 1; i >= 0; i--) {
    const value = ((name[i].charCodeAt(0) - 'A'.charCodeAt(0)) + 1)
    result = result + value * multiplier
    multiplier = multiplier * 26
  }
  return (result - 1)
}

class Row {
  constructor () {
    this.cells = []
  }
}

class Cell {
  constructor () {
  }
}

module.exports = class SheetParser extends EventEmitter{
  constructor () {
    super()
  }

  parse (entry, onClose, onError) {

    /*
     A1 -> 0
     A2 -> 0
     B2 -> 1
     */
    const getColumnFromDef = (coldef) => {
      let cc = ''
      for (let i = 0; i < coldef.length; i++) {
        if (isNaN(coldef[i])) {
          cc += coldef[i]
        } else {
          break
        }
      }
      return alphaNum(cc)
    }

    const parser = expat.createParser()
    let addvalue = false
    let row
    let cell
    parser.on('startElement', (name, attrs) => {
      if (name === 'row') {
        row = new Row()
      } else if (name === 'c') {
        cell = new Cell(this.options)
        cell.type = (attrs.t ? attrs.t : 'n')
        cell.styleIndex = attrs.s
        cell.col = getColumnFromDef(attrs.r)
        while (row.cells.length < cell.col) {
          const empty = new Cell()
          empty.col = row.cells.length
          row.cells.push(empty)
        }
        row.cells.push(cell)
      } else if (name === 'v') {
        addvalue = true
      } else if (name === 't') {
        addvalue = true
		  } else {
      }
    })
    parser.on('endElement', name => {
      if (name === 'row') {
        if (row) {
          this.emit('row', row, () => {
            entry.unpipe(parser)
            parser.pause()
            parser.end()
            entry.autodrain()
          })
        }
      } else if (name === 'v') {
        addvalue = false
      } else if (name === 't') {
        addvalue = false
      } else if (name === 'c') {
        addvalue = false
        this.emit('cell', cell)
      }
    })
    parser.on('text', txt => {
      if (addvalue) {
        cell.val = (cell.val ? cell.val : '') + txt
      }
    })
    parser.on('error', err => {
      onError && onError(err)
      this.emit('error', err)
    })
    parser.on('close', () => {
      onClose && onClose()
      this.emit('finish')
    })
    entry.pipe(parser)
  }
}