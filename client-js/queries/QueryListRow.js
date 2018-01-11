import React from 'react'
import { Link } from 'react-router-dom'
import Label from 'react-bootstrap/lib/Label'
import DeleteButton from '../common/DeleteButton'
import ListGroup from 'react-bootstrap/lib/ListGroup'

class QueryListRow extends React.Component {
  constructor() {
    super()
    this.state = {
      id: ''
    }
  }

  handleMouseOver = e => {
    const { handleQueryListRowMouseOver, query } = this.props
    handleQueryListRowMouseOver(query)
  }

  handleDeleteClick = e => {
    const { handleQueryDelete, query } = this.props
    handleQueryDelete(query._id)
  }

  myChange = () => {
    var tet = this.refs.myInput
    this.setState({ id: tet.value })
  }

  handExecClick = e => {
    const { config, query } = this.props
    var tableUrl = `${config.baseUrl}/query-table/${query._id}?`
    alert('sss')
    e.href = tableUrl
  }

  inputModify = () => {}

  render() {
    const { config, query, selectedQuery } = this.props
    const tagLabels = query.tags.map(tag => (
      <Label bsStyle="info" key={tag} style={{ marginLeft: 4 }}>
        {tag}
      </Label>
    ))

    const inputs = query.parameter.map(param => {
      return (
        <div>
          <span>{param.number3}:</span>
          <input
            type="text"
            style={{ marginLeft: 5 }}
            name={param.number1}
            onChange={this.inputModify}
          />
        </div>
      )
    })

    const tableUrl = `${config.baseUrl}/query-table/${query._id}?id=${this.state
      .id}`
    const chartUrl = `${config.baseUrl}/query-chart/${query._id}`

    const classNames = ['list-group-item']
    if (selectedQuery && selectedQuery._id === query._id) {
      classNames.push('bg-near-white')
    }

    return (
      <li
        onClick={this.onClick}
        className={classNames.join(' ')}
        onMouseOver={this.handleMouseOver}
        onMouseOut={this.onMouseOut}
      >
        <h4>
          <Link to={'/queries/' + query._id}>{query.name}</Link>
        </h4>
        <p>
          {query.createdBy} {tagLabels}
        </p>
        <form onSubmit={this.handleSubmit}>
          <ListGroup className="overflow-y-auto">{inputs}</ListGroup>
        </form>
        <p>
          <a href={tableUrl} target="_blank" rel="noopener noreferrer">
            <button onClick={this.handExecClick}>执行</button>
          </a>{' '}
          {/*<a href={chartUrl} target="_blank" rel="noopener noreferrer">*/}
          {/**/}
          {/*</a>{' '}*/}
        </p>

        <DeleteButton onClick={this.handleDeleteClick} />
      </li>
    )
  }
}

export default QueryListRow
