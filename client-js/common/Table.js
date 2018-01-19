import React from 'react'
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table'
import 'react-bootstrap-table/dist/react-bootstrap-table.min.css'

class Table extends React.Component {
  render() {
    const options = {
      afterInsertRow: this.onAfterInsertRow,
      onDeleteRow: this.onDeleteRow
    }

    const selectRowProp = {
      mode: 'checkbox'
    }

    return (
      <BootstrapTable
        data={this.props.data}
        insertRow={true}
        options={options}
        deleteRow={true}
        selectRow={selectRowProp}
      >
        <TableHeaderColumn dataField="id" isKey={true}>
          ID
        </TableHeaderColumn>
        <TableHeaderColumn dataField="name">标识</TableHeaderColumn>
        <TableHeaderColumn dataField="type">类型</TableHeaderColumn>
        <TableHeaderColumn dataField="instructions">说明</TableHeaderColumn>
      </BootstrapTable>
    )
  }

  onAfterInsertRow = row => {
    this.props.onAddRows(row)
  }

  onDeleteRow = row => {
    this.props.onDeleteRows(row)
  }
}

export default Table
