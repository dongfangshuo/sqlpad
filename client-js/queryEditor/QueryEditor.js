import React from 'react'
import Alert from 'react-s-alert'
import SplitPane from 'react-split-pane'
import { Prompt } from 'react-router-dom'
import fetchJson from '../utilities/fetch-json.js'
import uuid from 'uuid'
import keymaster from 'keymaster'
import QueryResultDataTable from '../common/QueryResultDataTable.js'
import SqlpadTauChart from '../common/SqlpadTauChart.js'
import QueryResultHeader from './QueryResultHeader.js'
import QueryDetailsModal from './QueryDetailsModal'
import EditorNavBar from './EditorNavBar'
import FlexTabPane from './FlexTabPane'
import SchemaSidebar from './SchemaSidebar.js'
import VisSidebar from './VisSidebar'
import SqlEditor from '../common/SqlEditor'
import sqlFormatter from 'sql-formatter'
import './style.css'

const NEW_QUERY = {
  _id: '',
  name: '',
  tags: [],
  connectionId: '',
  queryText: '',
  chartConfiguration: {
    chartType: '',
    fields: {} // key value for chart
  },
  parameter: [],
  parameterText: ''
}

class QueryEditor extends React.Component {
  state = {
    activeTabKey: 'sql',
    availableTags: [],
    cacheKey: uuid.v1(),
    connections: [],
    isRunning: false,
    isSaving: false,
    unsavedChanges: false,
    query: Object.assign({}, NEW_QUERY),
    queryResult: undefined,
    runQueryStartTime: undefined,
    showModal: false,
    showValidation: false,
    listRow: [1]
  }

  sqlpadTauChart = undefined

  getTagOptions() {
    const { availableTags, query } = this.state
    const tagOptions = availableTags.map(t => {
      return { value: t, label: t }
    })
    if (query && query.tags) {
      query.tags.forEach(t => {
        tagOptions.push({ value: t, label: t })
      })
    }
    return tagOptions
  }

  loadConnectionsFromServer = () => {
    const { query } = this.state
    fetchJson('GET', '/api/connections/').then(json => {
      const { error, connections } = json
      if (error) {
        Alert.error(error)
      }
      // if only 1 connection auto-select it
      if (connections.length === 1 && query) {
        query.connectionId = connections[0]._id
      }
      this.setState({ connections, query })
    })
  }

  loadQueryFromServer = queryId => {
    fetchJson('GET', `/api/queries/${queryId}`).then(json => {
      const { error, query } = json
      if (error) {
        Alert.error(error)
      }
      this.setState({ query })
    })
  }

  loadTagsFromServer = () => {
    fetchJson('GET', '/api/tags').then(json => {
      const { error, tags } = json
      if (error) {
        Alert.error(error)
      }
      this.setState({ availableTags: tags })
    })
  }

  runQuery = () => {
    const { cacheKey, query } = this.state
    const selectedText = this.editor.session.getTextRange(
      this.editor.getSelectionRange()
    )
    this.setState({
      isRunning: true,
      runQueryStartTime: new Date()
    })
    const postData = {
      connectionId: query.connectionId,
      cacheKey,
      queryName: query.name,
      queryText: selectedText || query.queryText
    }
    fetchJson('POST', '/api/query-result', postData).then(json => {
      if (json.error) Alert.error(json.error)
      this.setState({
        isRunning: false,
        queryError: json.error,
        queryResult: json.queryResult
      })
    })
  }

  handleCloneClick = () => {
    const { config } = this.props
    const { query } = this.state
    delete query._id
    query.name = 'Copy of ' + query.name
    window.history.replaceState({}, query.name, `${config.baseUrl}/queries/new`)
    this.setState({ query, unsavedChanges: true })
  }

  formatQuery = () => {
    const { query } = this.state
    query.queryText = sqlFormatter.format(query.queryText)
    this.setState({
      query,
      unsavedChanges: true
    })
  }

  saveQuery = () => {
    const { query } = this.state
    const { config } = this.props

    let myparameterArray = []
    let typeArray = []
    let instructionsArray = []
    let parArray = []

    let myparameter = document.getElementsByName('myparameter')
    let mytype = document.getElementsByName('mytype')
    let instructions = document.getElementsByName('instructions')

    for (let i = 0, j = myparameter.length; i < j; i++) {
      myparameterArray.push(myparameter[i].value)
    }
    for (let i = 0, j = mytype.length; i < j; i++) {
      typeArray.push(mytype[i].value)
    }
    for (let i = 0, j = instructions.length; i < j; i++) {
      instructionsArray.push(instructions[i].value)
    }
    for (let i = 0, j = instructions.length; i < j; i++) {
      let par = {
        number1: myparameterArray[i],
        number2: typeArray[i] === 'volvo' ? 'string' : 'int',
        number3: instructionsArray[i]
      }
      parArray.push(par)
    }

    this.setQueryState('parameter', parArray)

    if (!query.name) {
      Alert.error('Query name required')
      this.setState({ showValidation: true })
      return
    }
    if (query.parameterText) {
      var parameter = query.parameterText.split(' ')
      this.setQueryState('parameter', parameter)
    }
    this.setState({ isSaving: true })
    if (query._id) {
      console.log(query)
      fetchJson('PUT', `/api/queries/${query._id}`, query).then(json => {
        const { error, query } = json
        if (error) {
          Alert.error(error)
          this.setState({ isSaving: false })
          return
        }
        Alert.success('Query Saved')
        this.setState({ isSaving: false, unsavedChanges: false, query })
        window.history.go(-1)
      })
    } else {
      fetchJson('POST', `/api/queries`, query).then(json => {
        const { error, query } = json
        if (error) {
          Alert.error(error)
          this.setState({ isSaving: false })
          return
        }
        window.history.replaceState(
          {},
          query.name,
          `${config.baseUrl}/queries/${query._id}`
        )
        Alert.success('Query Saved')
        this.setState({ isSaving: false, unsavedChanges: false, query })
        window.history.go(-1)
      })
    }
  }

  setQueryState = (field, value) => {
    const { query } = this.state
    if (!query[field] && query[field] === 'parameter') {
      query.parameter = value
    }
    query[field] = value
    this.setState({ query, unsavedChanges: true })
  }

  handleChartConfigurationFieldsChange = (chartFieldId, queryResultField) => {
    const { query } = this.state
    query.chartConfiguration.fields[chartFieldId] = queryResultField
    this.setState({ query, unsavedChanges: true })
  }

  handleChartTypeChange = e => {
    const { query } = this.state
    query.chartConfiguration.chartType = e.target.value
    this.setState({ query, unsavedChanges: true })
  }

  handleConnectionChange = connectionId => {
    this.setQueryState('connectionId', connectionId)
  }

  handleModalHide = () => {
    this.setState({ showModal: false })
  }

  handleQueryNameChange = name => this.setQueryState('name', name)

  handleMoreClick = () => this.setState({ showModal: true })

  handleQueryTagsChange = values =>
    this.setQueryState('tags', values.map(v => v.value))

  handleQueryTextChange = queryText =>
    this.setQueryState('queryText', queryText)

  handleSaveImageClick = e => {
    if (this.sqlpadTauChart && this.sqlpadTauChart.chart) {
      this.sqlpadTauChart.chart.fire('exportTo', 'png')
    }
  }

  HandleQueryParameterChange = e => {
    this.setQueryState('parameterText', e)
  }

  handleTabSelect = activeTabKey => this.setState({ activeTabKey })

  handleVisualizeClick = () => this.sqlpadTauChart.renderChart(true)

  hasRows = () => {
    const queryResult = this.state.queryResult
    return !!(queryResult && queryResult.rows && queryResult.rows.length)
  }

  isChartable = () => {
    const { isRunning, queryError, activeTabKey } = this.state
    const pending = isRunning || queryError
    return !pending && activeTabKey === 'vis' && this.hasRows()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.queryId === 'new') {
      return this.setState({
        activeTabKey: 'sql',
        queryResult: undefined,
        query: Object.assign({}, NEW_QUERY),
        unsavedChanges: false
      })
    }
    this.loadQueryFromServer(nextProps.queryId)
  }

  componentDidMount() {
    const { queryId } = this.props

    this.loadConnectionsFromServer()
    this.loadTagsFromServer()
    if (queryId !== 'new') {
      this.loadQueryFromServer(queryId)
    }

    /*  Shortcuts
    ============================================================================== */
    // keymaster doesn't fire on input/textarea events by default
    // since we are only using command/ctrl shortcuts,
    // we want the event to fire all the time for any element
    keymaster.filter = () => true
    keymaster.unbind('ctrl+s, command+s')
    keymaster('ctrl+s, command+s', e => {
      this.saveQuery()
      e.preventDefault()
      return false
    })
    // there should only ever be 1 QueryEditor on the page,
    // but just in case there isn't unbind anything previously bound
    // rather something previously not run than something run more than once
    keymaster.unbind('ctrl+r, command+r, ctrl+e, command+e')
    keymaster('ctrl+r, command+r, ctrl+e, command+e', e => {
      Alert.info('Shortcut changed to ctrl+return / command+return')
      e.preventDefault()
      return false
    })
    keymaster.unbind('ctrl+return, command+return')
    keymaster('ctrl+return, command+return', e => {
      this.runQuery()
      e.preventDefault()
      return false
    })
    keymaster.unbind('alt+r')
    keymaster('alt+r', e => {
      Alert.info('Shortcut changed to shift+return')
      e.preventDefault()
      return false
    })
    keymaster.unbind('shift+return')
    keymaster('shift+return', e => {
      this.formatQuery()
      e.preventDefault()
      return false
    })
  }

  componentWillUnmount() {
    keymaster.unbind('ctrl+return, command+return')
    keymaster.unbind('ctrl+s, command+s')
    keymaster.unbind('ctrl+r, command+r, ctrl+e, command+e')
    keymaster.unbind('alt+r')
    keymaster.unbind('shift+return')
  }

  handleFormatClick = () => {
    this.formatQuery()
  }

  handleSqlPaneResize = () => {
    if (this.editor) {
      this.editor.resize()
    }
    if (this.dataTable) {
      this.dataTable.handleResize()
    }
  }

  handleVisPaneResize = () => {
    if (this.sqlpadTauChart && this.sqlpadTauChart.chart) {
      this.sqlpadTauChart.chart.resize()
    }
  }

  render() {
    const { config } = this.props
    const {
      activeTabKey,
      cacheKey,
      connections,
      isRunning,
      isSaving,
      query,
      queryError,
      queryResult,
      runQueryStartTime,
      runSeconds,
      showModal,
      showValidation,
      unsavedChanges
    } = this.state

    document.title = query.name || 'New Query'
    return (
      <div className="flex w-100" style={{ flexDirection: 'column' }}>
        <EditorNavBar
          activeTabKey={activeTabKey}
          isRunning={isRunning}
          isSaving={isSaving}
          onCloneClick={this.handleCloneClick}
          onMoreClick={this.handleMoreClick}
          onRunClick={this.runQuery}
          onSaveClick={this.saveQuery}
          onFormatClick={this.handleFormatClick}
          onTabSelect={this.handleTabSelect}
          query={query}
          onQueryNameChange={this.handleQueryNameChange}
          showValidation={showValidation}
          unsavedChanges={unsavedChanges}
        />
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <FlexTabPane tabKey="sql" activeTabKey={activeTabKey}>
            <SplitPane
              split="vertical"
              minSize={150}
              defaultSize={280}
              maxSize={-100}
              onChange={this.handleSqlPaneResize}
            >
              <SchemaSidebar
                {...this.props}
                connectionId={query.connectionId}
                connections={connections}
                onConnectionChange={this.handleConnectionChange}
              />

              <SplitPane
                split="horizontal"
                minSize={100}
                defaultSize={'60%'}
                maxSize={-100}
                onChange={this.handleSqlPaneResize}
              >
                <SplitPane split="horizontal" minSize={150}>
                  <div className={'auto'}>
                    {this.renderList()}
                    <div className={'button'} onClick={this.addList}>
                      确认添加
                    </div>
                  </div>
                  <SqlEditor
                    config={config}
                    value={query.queryText}
                    onChange={this.handleQueryTextChange}
                    ref={ref => {
                      this.editor = ref ? ref.editor : null
                    }}
                  />
                </SplitPane>
                <div>
                  <QueryResultHeader
                    {...this.props}
                    cacheKey={cacheKey}
                    isRunning={isRunning}
                    queryResult={queryResult}
                    runQueryStartTime={runQueryStartTime}
                    runSeconds={runSeconds}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 30,
                      bottom: 0,
                      left: 0,
                      right: 0
                    }}
                  >
                    <QueryResultDataTable
                      {...this.props}
                      isRunning={isRunning}
                      queryError={queryError}
                      queryResult={queryResult}
                      ref={ref => (this.dataTable = ref)}
                    />
                  </div>
                </div>
              </SplitPane>
            </SplitPane>
          </FlexTabPane>
          <FlexTabPane tabKey="vis" activeTabKey={activeTabKey}>
            <SplitPane
              split="vertical"
              minSize={150}
              defaultSize={280}
              maxSize={-100}
              onChange={this.handleVisPaneResize}
            >
              <VisSidebar
                isChartable={this.isChartable()}
                onChartConfigurationFieldsChange={
                  this.handleChartConfigurationFieldsChange
                }
                onChartTypeChange={this.handleChartTypeChange}
                onSaveImageClick={this.handleSaveImageClick}
                onVisualizeClick={this.handleVisualizeClick}
                query={query}
                queryResult={queryResult}
              />
              <div className="flex-auto h-100">
                <SqlpadTauChart
                  config={this.props.config}
                  isRunning={isRunning}
                  query={query}
                  queryError={queryError}
                  queryResult={queryResult}
                  renderChart={this.isChartable()}
                  ref={ref => {
                    this.sqlpadTauChart = ref
                  }}
                />
              </div>
            </SplitPane>
          </FlexTabPane>
        </div>
        <QueryDetailsModal
          config={config}
          onHide={this.handleModalHide}
          onQueryTagsChange={this.handleQueryTagsChange}
          query={query}
          showModal={showModal}
          tagOptions={this.getTagOptions()}
        />
        <Prompt
          when={unsavedChanges}
          message={location => `Leave without saving?`}
        />
      </div>
    )
  }

  renderList() {
    const numbers = this.state.listRow
    const listItems = numbers.map(number => (
      <li style={{ marginTop: 10 }} key={number}>
        <input
          type="text"
          style={{ width: 120 }}
          placeholder="参数名称"
          ref={'myparameter'}
          name="myparameter"
        />
        <select style={{ marginLeft: 5 }} ref={'mytype'} name="mytype">
          <option value="volvo">string</option>
          <option value="saab">int</option>
        </select>
        <input
          type="text"
          style={{ width: 350, marginLeft: 5 }}
          placeholder="参数说明"
          ref={'instructions'}
          name="instructions"
        />
      </li>
    ))
    return <ol>{listItems}</ol>
  }
  addList = () => {
    this.state.listRow.push(
      this.state.listRow[this.state.listRow.length - 1] + 1
    )
    this.setState({ listRow: this.state.listRow })
  }
}

export default QueryEditor
