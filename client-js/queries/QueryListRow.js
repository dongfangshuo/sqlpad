import React from 'react'
import { Link } from 'react-router-dom'
import Label from 'react-bootstrap/lib/Label'
import DeleteButton from '../common/DeleteButton'
import ListGroup from 'react-bootstrap/lib/ListGroup'
import fetchJson from '../utilities/fetch-json'

class QueryListRow extends React.Component {
  constructor() {
    super()
    this.state = {
      id: '',
      currentUser: {}
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

  handExecClick = e => {
    const { config, query } = this.props
    var str = ''
    query.parameter.map(param => {
      str += param.number1 + '=' + this.refs[param.number1].value
      str += '&'
      return param
    })
    console.log(str)
    var tableUrl = `${config.baseUrl}/query-table/${query._id}?` + str
    e.target.parentNode.setAttribute('href', tableUrl)
  }

  componentDidMount() {
    fetchJson('GET', '/api/app').then(json => {
      this.setState({
        currentUser: json.currentUser,
        version: json.version,
        passport: json.passport,
        config: json.config
      })
    })
  }

  render() {
    const { config, query, selectedQuery } = this.props
    const { currentUser } = this.state

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
            ref={param.number1}
            name={param.number1}
          />
        </div>
      )
    })

    const tableUrl = `${config.baseUrl}/query-table/${query._id}?id=${this.state
      .id}`
    // const chartUrl = `${config.baseUrl}/query-chart/${query._id}`

    const classNames = ['list-group-item']
    if (selectedQuery && selectedQuery._id === query._id) {
      classNames.push('bg-near-white')
    }
    var name
    var del
    if (currentUser.role === 'admin') {
      name = <Link to={'/queries/' + query._id}>{query.name}</Link>
      del = <DeleteButton onClick={this.handleDeleteClick} />
    } else {
      name = query.name
    }
    return (
      <li
        onClick={this.onClick}
        className={classNames.join(' ')}
        onMouseOver={this.handleMouseOver}
        onMouseOut={this.onMouseOut}
      >
        <h4>{name}</h4>
        <p>
          {query.createdBy} {tagLabels}
        </p>
        <form onSubmit={this.handleSubmit}>
          <ListGroup className="overflow-y-auto">{inputs}</ListGroup>
        </form>
        <p>
          <a href={tableUrl} target="_blank" rel="noopener noreferrer">
            <button onClick={this.handExecClick}>执行</button>
          </a>
        </p>
        {del}
      </li>
    )
  }
}

export default QueryListRow
