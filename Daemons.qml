import QtQuick
import Quickshell
import qs.Ui

BarWidget {
  id: root

  // "collapsed": true on the bar entry keeps this widget live on the bar (its
  // service and panels still work) but takes no space; a drawer launches it.
  Binding {
    target: root
    property: "visible"
    value: false
    when: !!root.settings && root.settings.collapsed === true
  }
  moduleName: "io.github.s3pp3ku.omarchy-daemons"

  function launch() {
    if (!root.bar) return
    root.bar.run("omarchy-launch-webapp " + Qt.resolvedUrl("index.html"))
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: "λ"
    tooltipText: "Launch Omarchy Daemons"
    onPressed: root.launch()
  }
}
