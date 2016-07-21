// Include gulp
const gulp = require('gulp');
const babel = require('gulp-babel');
// Include plugins
/*var concat = require('gulp-concat');
var uglify = require('gulp-uglify');*/
const rename = require('gulp-rename');

gulp.task('scripts', function() {
    return gulp.src('public/learnWords/*.js')
        .pipe(rename({suffix: '.min'}))
        .pipe(babel({
            presets: ['es2015']
        }))
});

gulp.task('default', function () {
    gulp.watch('public/learnWords/*.js', ['scripts']);
});

