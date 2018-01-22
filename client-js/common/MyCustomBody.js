import React from 'react'
import 'react-bootstrap-table/dist/react-bootstrap-table.min.css'
import '../queryEditor/style.css'
class MyCustomBody extends React.Component {
  getFieldValue() {
    const newRow = {}
    this.props.columns.forEach((column, i) => {
      newRow[column.field] = this.refs[column.field].value
    }, this)
    return newRow
  }

  render() {
    const { columns, validateState } = this.props
    return (
      <div className="modal-body">
        <div>
          {this.props.columns.map((column, i) => {
            const { editable, format, field, name, hiddenOnInsert } = column

            if (name === '类型') {
              return (
                <div className="form-group" key={field}>
                  <div className="input-group">
                    <span className="input-group-addon">{name}</span>
                    <select
                      style={{
                        flex: 1,
                        height: 35,
                        width: 515,
                        borderRadius: 0,
                        fontSize: 14
                      }}
                      className={'select'}
                      ref={field}
                    >
                      <option value="string">string</option>
                      <option value="int">int</option>
                    </select>
                  </div>
                </div>
              )
            }
            const error = validateState[field] ? (
              <span className="help-block bg-danger">
                {validateState[field]}
              </span>
            ) : null
            return (
              <div className="form-group" key={field}>
                <div className="input-group">
                  <span className="input-group-addon">{name}</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={name}
                    ref={field}
                  >
                    {error}
                  </input>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
}

export default MyCustomBody
